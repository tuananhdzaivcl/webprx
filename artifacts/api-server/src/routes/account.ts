import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  depositsTable,
  ordersTable,
  transactionsTable,
} from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/account/summary", requireAuth(), async (req, res) => {
  const deposits = await db
    .select()
    .from(depositsTable)
    .where(and(eq(depositsTable.userId, req.user!.id), eq(depositsTable.status, "approved")));
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.user!.id));
  const totalDeposited = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const totalSpent = orders.reduce((s, o) => s + Number(o.price), 0);
  res.json({
    balance: Number(req.user!.balance),
    totalDeposited,
    totalSpent,
    ordersCount: orders.length,
  });
});

router.get("/account/transactions", requireAuth(), async (req, res) => {
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, req.user!.id))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(
    rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

export default router;
