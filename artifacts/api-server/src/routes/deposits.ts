import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { depositsTable, usersTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { CreateDepositBody as CreateDepositRequest } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/deposits", requireAuth(), async (req, res) => {
  const rows = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, req.user!.id))
    .orderBy(desc(depositsTable.createdAt));
  res.json(
    rows.map((d) => ({
      id: d.id,
      userId: d.userId,
      username: req.user!.username,
      amount: Number(d.amount),
      status: d.status,
      note: d.note,
      createdAt: d.createdAt.toISOString(),
    })),
  );
});

router.post("/deposits", requireAuth(), async (req, res) => {
  const parsed = CreateDepositRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  if (parsed.data.amount <= 0) {
    res.status(400).json({ error: "Số tiền phải lớn hơn 0" });
    return;
  }
  const inserted = await db
    .insert(depositsTable)
    .values({
      userId: req.user!.id,
      amount: parsed.data.amount.toFixed(2),
      status: "pending",
      note: parsed.data.note,
    })
    .returning();
  const d = inserted[0]!;
  res.json({
    id: d.id,
    userId: d.userId,
    username: req.user!.username,
    amount: Number(d.amount),
    status: d.status,
    note: d.note,
    createdAt: d.createdAt.toISOString(),
  });
});

// admin-side queries are in admin route. For owner ref join when listing, we used req.user.username directly.

export default router;

export async function fetchUsernameMap(userIds: number[]): Promise<Record<number, string>> {
  if (userIds.length === 0) return {};
  const all = await db.select().from(usersTable);
  const map: Record<number, string> = {};
  for (const u of all) map[u.id] = u.username;
  return map;
}
