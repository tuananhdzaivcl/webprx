import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  depositsTable,
  referralCommissionsTable,
  usersTable,
} from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/referral/summary", requireAuth(), async (req, res) => {
  const me = req.user!;
  const referees = await db.select().from(usersTable).where(eq(usersTable.referredBy, me.id));
  const commissions = await db
    .select()
    .from(referralCommissionsTable)
    .where(eq(referralCommissionsTable.referrerId, me.id))
    .orderBy(desc(referralCommissionsTable.createdAt));
  const totalCommission = commissions.reduce((s, c) => s + Number(c.amount), 0);

  const recent = [];
  for (const r of referees.slice(0, 20)) {
    const deps = await db
      .select()
      .from(depositsTable)
      .where(and(eq(depositsTable.userId, r.id), eq(depositsTable.status, "approved")));
    const totalDeposited = deps.reduce((s, d) => s + Number(d.amount), 0);
    const earned = commissions
      .filter((c) => c.refereeId === r.id)
      .reduce((s, c) => s + Number(c.amount), 0);
    recent.push({
      username: r.username,
      joinedAt: r.createdAt.toISOString(),
      totalDeposited,
      commissionEarned: earned,
    });
  }

  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const referralLink = host ? `${proto}://${host}/dang-ky?ref=${me.referralCode}` : `/dang-ky?ref=${me.referralCode}`;

  res.json({
    referralCode: me.referralCode,
    referralLink,
    referredCount: referees.length,
    totalCommission,
    recentReferrals: recent,
  });
});

export default router;
