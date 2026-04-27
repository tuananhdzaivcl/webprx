import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  RegisterBody as RegisterRequest,
  LoginBody as LoginRequest,
} from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  newReferralCode,
  createSession,
  destroySession,
  getSessionUser,
  safeUsername,
} from "../lib/auth";

const router: IRouter = Router();

function toSession(u: typeof usersTable.$inferSelect, referredByCode: string | null) {
  return {
    id: u.id,
    username: u.username,
    balance: Number(u.balance),
    isAdmin: u.isAdmin,
    referralCode: u.referralCode,
    referredBy: referredByCode,
  };
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  const username = safeUsername(parsed.data.username);
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
    return;
  }
  let referredById: number | null = null;
  let referredByCode: string | null = null;
  if (parsed.data.referralCode) {
    const code = parsed.data.referralCode.trim().toUpperCase();
    const ref = await db.select().from(usersTable).where(eq(usersTable.referralCode, code)).limit(1);
    if (ref.length > 0) {
      referredById = ref[0]!.id;
      referredByCode = ref[0]!.referralCode;
    }
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const inserted = await db
    .insert(usersTable)
    .values({
      username,
      passwordHash,
      referralCode: newReferralCode(),
      referredBy: referredById,
    })
    .returning();
  const user = inserted[0]!;
  await createSession(user.id, res);
  res.json(toSession(user, referredByCode));
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  const username = safeUsername(parsed.data.username);
  const found = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (found.length === 0) {
    res.status(400).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
    return;
  }
  const user = found[0]!;
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(400).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
    return;
  }
  let referredByCode: string | null = null;
  if (user.referredBy) {
    const ref = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
    if (ref.length > 0) referredByCode = ref[0]!.referralCode;
  }
  await createSession(user.id, res);
  res.json(toSession(user, referredByCode));
});

router.post("/auth/logout", async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Chưa đăng nhập" });
    return;
  }
  let referredByCode: string | null = null;
  if (user.referredBy) {
    const ref = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
    if (ref.length > 0) referredByCode = ref[0]!.referralCode;
  }
  res.json(toSession(user, referredByCode));
});

export default router;
