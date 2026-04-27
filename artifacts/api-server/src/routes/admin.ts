import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  categoriesTable,
  depositsTable,
  ordersTable,
  productKeysTable,
  productsTable,
  referralCommissionsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  AdminAdjustBalanceBody as AdjustBalanceRequest,
  AdminAddProductKeysBody as AddProductKeysRequest,
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

async function computeStockMap(): Promise<Record<number, { available: number; hasPool: boolean }>> {
  const all = await db.select().from(productKeysTable);
  const map: Record<number, { available: number; hasPool: boolean }> = {};
  for (const k of all) {
    if (!map[k.productId]) map[k.productId] = { available: 0, hasPool: false };
    map[k.productId]!.hasPool = true;
    if (!k.isUsed) map[k.productId]!.available += 1;
  }
  return map;
}

function effectiveStock(p: { id: number; stock: number }, m: Record<number, { available: number; hasPool: boolean }>) {
  const e = m[p.id];
  if (e?.hasPool) return e.available;
  return p.stock;
}

router.get("/admin/products", requireAdmin(), async (_req, res) => {
  const products = await db.select().from(productsTable).orderBy(desc(productsTable.id));
  const cattable = await db.select().from(categoriesTable);
  const catMap: Record<number, string> = {};
  for (const c of cattable) catMap[c.id] = c.name;
  const stockMap = await computeStockMap();
  res.json(
    products.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      categoryName: catMap[p.categoryId] ?? "",
      name: p.name,
      description: p.description,
      price: Number(p.price),
      stock: effectiveStock(p, stockMap),
      sold: p.sold,
      imageUrl: p.imageUrl,
      active: p.active,
    })),
  );
});

router.get("/admin/products/:id/keys", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID không hợp lệ" });
    return;
  }
  const keys = await db
    .select()
    .from(productKeysTable)
    .where(eq(productKeysTable.productId, id))
    .orderBy(desc(productKeysTable.id));
  const used = keys.filter((k) => k.isUsed).length;
  res.json({
    productId: id,
    totalKeys: keys.length,
    availableKeys: keys.length - used,
    usedKeys: used,
    keys: keys.map((k) => ({
      id: k.id,
      productId: k.productId,
      keyValue: k.keyValue,
      isUsed: k.isUsed,
      usedByOrderId: k.usedByOrderId,
      createdAt: k.createdAt.toISOString(),
      usedAt: k.usedAt ? k.usedAt.toISOString() : null,
    })),
  });
});

router.post("/admin/products/:id/keys", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID không hợp lệ" });
    return;
  }
  const product = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (product.length === 0) {
    res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    return;
  }
  const parsed = AddProductKeysRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  const lines = parsed.data.keys
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  const existing = await db
    .select()
    .from(productKeysTable)
    .where(eq(productKeysTable.productId, id));
  for (const e of existing) seen.add(e.keyValue);
  const toInsert = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    toInsert.push({ productId: id, keyValue: line });
  }
  if (toInsert.length > 0) {
    await db.insert(productKeysTable).values(toInsert);
  }
  const all = await db
    .select()
    .from(productKeysTable)
    .where(eq(productKeysTable.productId, id))
    .orderBy(desc(productKeysTable.id));
  const used = all.filter((k) => k.isUsed).length;
  await db
    .update(productsTable)
    .set({ stock: all.length - used })
    .where(eq(productsTable.id, id));
  res.json({
    productId: id,
    totalKeys: all.length,
    availableKeys: all.length - used,
    usedKeys: used,
    keys: all.map((k) => ({
      id: k.id,
      productId: k.productId,
      keyValue: k.keyValue,
      isUsed: k.isUsed,
      usedByOrderId: k.usedByOrderId,
      createdAt: k.createdAt.toISOString(),
      usedAt: k.usedAt ? k.usedAt.toISOString() : null,
    })),
  });
});

router.delete("/admin/products/:id/keys/:keyId", requireAdmin(), async (req, res) => {
  const productId = Number(req.params.id);
  const keyId = Number(req.params.keyId);
  if (!Number.isFinite(productId) || !Number.isFinite(keyId)) {
    res.status(400).json({ error: "ID không hợp lệ" });
    return;
  }
  const found = await db
    .select()
    .from(productKeysTable)
    .where(and(eq(productKeysTable.id, keyId), eq(productKeysTable.productId, productId)))
    .limit(1);
  if (found.length === 0) {
    res.status(404).json({ error: "Không tìm thấy key" });
    return;
  }
  if (found[0]!.isUsed) {
    res.status(400).json({ error: "Không thể xoá key đã được sử dụng" });
    return;
  }
  await db.delete(productKeysTable).where(eq(productKeysTable.id, keyId));
  const all = await db
    .select()
    .from(productKeysTable)
    .where(eq(productKeysTable.productId, productId));
  const used = all.filter((k) => k.isUsed).length;
  await db
    .update(productsTable)
    .set({ stock: all.length - used })
    .where(eq(productsTable.id, productId));
  res.json({ ok: true });
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
  const cattable = await db.select().from(categoriesTable);
  const cat = cattable.find((c) => c.id === p.categoryId);
  const stockMap = await computeStockMap();
  res.json({
    id: p.id,
    categoryId: p.categoryId,
    categoryName: cat?.name ?? "",
    name: p.name,
    description: p.description,
    price: Number(p.price),
    stock: effectiveStock(p, stockMap),
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
  const cattable = await db.select().from(categoriesTable);
  const cat = cattable.find((c) => c.id === p.categoryId);
  const stockMap = await computeStockMap();
  res.json({
    id: p.id,
    categoryId: p.categoryId,
    categoryName: cat?.name ?? "",
    name: p.name,
    description: p.description,
    price: Number(p.price),
    stock: effectiveStock(p, stockMap),
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
