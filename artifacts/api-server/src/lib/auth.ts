import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const SESSION_COOKIE = "tap_sid";
const SESSION_TTL_DAYS = 30;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function newReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function createSession(userId: number, res: Response): Promise<string> {
  const id = randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({ id, userId });
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return id;
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sid));
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser(req: Request) {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (!sid) return null;
  const sess = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sid)).limit(1);
  if (sess.length === 0) return null;
  const userId = sess[0]!.userId;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (users.length === 0) return null;
  return users[0]!;
}

declare global {
  namespace Express {
    interface Request {
      user?: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
    }
  }
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: "Bạn cần đăng nhập" });
      return;
    }
    req.user = user;
    next();
  };
}

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getSessionUser(req);
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Không có quyền truy cập" });
      return;
    }
    req.user = user;
    next();
  };
}

export function generateOrderCode(): string {
  const r = randomBytes(8).toString("hex").toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `KEY-${ts}-${r.slice(0, 8)}`;
}

export function safeUsername(u: string): string {
  return u.trim().toLowerCase();
}

export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
