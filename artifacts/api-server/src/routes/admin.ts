import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  depositsTable,
  ordersTable,
  productsTable,
  referralCommissionsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  AdminAdjustBalanceBody as AdjustBalanceRequest,
  AdminCreateProductBody,
  AdminUpdateProductBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const REFERRAL_RATE = 0.2;

router.get("/admin/users", requireAdmin(), async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const out = [];
  for (const u of users) {
    const deps = await db
      .select()
      .from(depositsTable)
      .where(eq(depositsTable.userId, u.id));
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, u.id));
    const totalDeposited = deps
      .filter((d) => d.status === "approved")
      .reduce((s, d) => s + Number(d.amount), 0);
    let referredByCode: string | null = null;
    if (u.referredBy) {
      const ref = users.find((x) => x.id === u.referredBy);
      if (ref) referredByCode = ref.referralCode;
    }
    out.push({
      id: u.id,
      username: u.username,
      balance: Number(u.balance),
      isAdmin: u.isAdmin,
      referralCode: u.referralCode,
      referredBy: referredByCode,
      totalDeposited,
      ordersCount: orders.length,
      createdAt: u.createdAt.toISOString(),
    });
  }
  res.json(out);
});

router.post("/admin/users/:id/balance", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID không hợp lệ" });
    return;
  }
  const parsed = AdjustBalanceRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  const found = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (found.length === 0) {
    res.status(404).json({ error: "Không tìm thấy người dùng" });
    return;
  }
  const u = found[0]!;
  const newBalance = Number(u.balance) + parsed.data.amount;
  if (newBalance < 0) {
    res.status(400).json({ error: "Số dư không thể âm" });
    return;
  }
  await db.update(usersTable).set({ balance: newBalance.toFixed(2) }).where(eq(usersTable.id, id));
  await db.insert(transactionsTable).values({
    userId: id,
    type: parsed.data.amount >= 0 ? "admin_credit" : "admin_debit",
    amount: parsed.data.amount.toFixed(2),
    balanceAfter: newBalance.toFixed(2),
    description: `Admin: ${parsed.data.reason}`,
  });
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, id));
  const deps = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, id));
  const totalDeposited = deps
    .filter((d) => d.status === "approved")
    .reduce((s, d) => s + Number(d.amount), 0);
  res.json({
    id: u.id,
    username: u.username,
    balance: newBalance,
    isAdmin: u.isAdmin,
    referralCode: u.referralCode,
    referredBy: null,
    totalDeposited,
    ordersCount: orders.length,
    createdAt: u.createdAt.toISOString(),
  });
});

router.get("/admin/deposits", requireAdmin(), async (_req, res) => {
  const rows = await db.select().from(depositsTable).orderBy(desc(depositsTable.createdAt));
  const users = await db.select().from(usersTable);
  const map: Record<number, string> = {};
  for (const u of users) map[u.id] = u.username;
  res.json(
    rows.map((d) => ({
      id: d.id,
      userId: d.userId,
      username: map[d.userId] ?? "?",
      amount: Number(d.amount),
      status: d.status,
      note: d.note,
      createdAt: d.createdAt.toISOString(),
    })),
  );
});

router.post("/admin/deposits/:id/approve", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  const found = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  if (found.length === 0) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  const d = found[0]!;
  if (d.status !== "pending") {
    res.status(400).json({ error: "Yêu cầu đã được xử lý" });
    return;
  }
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, d.userId)).limit(1);
  if (userRows.length === 0) {
    res.status(404).json({ error: "Không tìm thấy người dùng" });
    return;
  }
  const user = userRows[0]!;
  const amount = Number(d.amount);
  const newBalance = Number(user.balance) + amount;
  await db.update(usersTable).set({ balance: newBalance.toFixed(2) }).where(eq(usersTable.id, user.id));
  await db.update(depositsTable).set({ status: "approved" }).where(eq(depositsTable.id, id));
  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "deposit",
    amount: amount.toFixed(2),
    balanceAfter: newBalance.toFixed(2),
    description: `Nạp tiền (đã duyệt): ${d.note}`,
  });

  if (user.referredBy) {
    const refRows = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
    if (refRows.length > 0) {
      const ref = refRows[0]!;
      const commission = +(amount * REFERRAL_RATE).toFixed(2);
      const newRefBalance = Number(ref.balance) + commission;
      await db.update(usersTable).set({ balance: newRefBalance.toFixed(2) }).where(eq(usersTable.id, ref.id));
      await db.insert(referralCommissionsTable).values({
        referrerId: ref.id,
        refereeId: user.id,
        depositId: d.id,
        amount: commission.toFixed(2),
      });
      await db.insert(transactionsTable).values({
        userId: ref.id,
        type: "referral",
        amount: commission.toFixed(2),
        balanceAfter: newRefBalance.toFixed(2),
        description: `Hoa hồng giới thiệu từ ${user.username}`,
      });
    }
  }

  res.json({
    id: d.id,
    userId: d.userId,
    username: user.username,
    amount,
    status: "approved",
    note: d.note,
    createdAt: d.createdAt.toISOString(),
  });
});

router.post("/admin/deposits/:id/reject", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  const found = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  if (found.length === 0) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  const d = found[0]!;
  if (d.status !== "pending") {
    res.status(400).json({ error: "Yêu cầu đã được xử lý" });
    return;
  }
  await db.update(depositsTable).set({ status: "rejected" }).where(eq(depositsTable.id, id));
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, d.userId)).limit(1);
  res.json({
    id: d.id,
    userId: d.userId,
    username: userRows[0]?.username ?? "?",
    amount: Number(d.amount),
    status: "rejected",
    note: d.note,
    createdAt: d.createdAt.toISOString(),
  });
});

router.get("/admin/products", requireAdmin(), async (_req, res) => {
  const products = await db.select().from(productsTable).orderBy(desc(productsTable.id));
  const cats = await db.select().from(productsTable);
  void cats;
  const cattable = await import("@workspace/db/schema").then((m) => db.select().from(m.categoriesTable));
  const catMap: Record<number, string> = {};
  for (const c of cattable) catMap[c.id] = c.name;
  res.json(
    products.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      categoryName: catMap[p.categoryId] ?? "",
      name: p.name,
      description: p.description,
      price: Number(p.price),
      stock: p.stock,
      sold: p.sold,
      imageUrl: p.imageUrl,
      active: p.active,
    })),
  );
});

router.post("/admin/products", requireAdmin(), async (req, res) => {
  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  const inserted = await db
    .insert(productsTable)
    .values({
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price.toFixed(2),
      stock: parsed.data.stock,
      imageUrl: parsed.data.imageUrl,
      active: parsed.data.active ?? true,
    })
    .returning();
  const p = inserted[0]!;
  const cattable = await import("@workspace/db/schema").then((m) => db.select().from(m.categoriesTable));
  const cat = cattable.find((c) => c.id === p.categoryId);
  res.json({
    id: p.id,
    categoryId: p.categoryId,
    categoryName: cat?.name ?? "",
    name: p.name,
    description: p.description,
    price: Number(p.price),
    stock: p.stock,
    sold: p.sold,
    imageUrl: p.imageUrl,
    active: p.active,
  });
});

router.patch("/admin/products/:id", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = AdminUpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  await db
    .update(productsTable)
    .set({
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price.toFixed(2),
      stock: parsed.data.stock,
      imageUrl: parsed.data.imageUrl,
      active: parsed.data.active ?? true,
    })
    .where(eq(productsTable.id, id));
  const found = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (found.length === 0) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  const p = found[0]!;
  const cattable = await import("@workspace/db/schema").then((m) => db.select().from(m.categoriesTable));
  const cat = cattable.find((c) => c.id === p.categoryId);
  res.json({
    id: p.id,
    categoryId: p.categoryId,
    categoryName: cat?.name ?? "",
    name: p.name,
    description: p.description,
    price: Number(p.price),
    stock: p.stock,
    sold: p.sold,
    imageUrl: p.imageUrl,
    active: p.active,
  });
});

router.delete("/admin/products/:id", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ ok: true });
});

router.get("/admin/stats", requireAdmin(), async (_req, res) => {
  const users = await db.select().from(usersTable);
  const deposits = await db.select().from(depositsTable);
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  const totalRevenue = orders.reduce((s, o) => s + Number(o.price), 0);
  const pendingDeposits = deposits.filter((d) => d.status === "pending").length;
  res.json({
    totalUsers: users.length,
    totalRevenue,
    pendingDeposits,
    totalOrders: orders.length,
    recentOrders: orders.slice(0, 10).map((o) => ({
      id: o.id,
      productId: o.productId,
      productName: o.productName,
      price: Number(o.price),
      status: o.status,
      code: o.code,
      createdAt: o.createdAt.toISOString(),
    })),
  });
});

export default router;
