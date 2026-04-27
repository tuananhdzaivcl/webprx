import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  productsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { CreateOrderBody as CreateOrderRequest } from "@workspace/api-zod";
import { requireAuth, generateOrderCode } from "../lib/auth";

const router: IRouter = Router();

router.get("/orders", requireAuth(), async (req, res) => {
  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.user!.id))
    .orderBy(desc(ordersTable.createdAt));
  res.json(
    rows.map((o) => ({
      id: o.id,
      productId: o.productId,
      productName: o.productName,
      price: Number(o.price),
      status: o.status,
      code: o.code,
      createdAt: o.createdAt.toISOString(),
    })),
  );
});

router.post("/orders", requireAuth(), async (req, res) => {
  const parsed = CreateOrderRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    return;
  }
  const productId = parsed.data.productId;
  const found = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (found.length === 0 || !found[0]!.active) {
    res.status(400).json({ error: "Sản phẩm không tồn tại" });
    return;
  }
  const product = found[0]!;
  if (product.stock <= 0) {
    res.status(400).json({ error: "Sản phẩm đã hết hàng" });
    return;
  }
  const price = Number(product.price);
  const balance = Number(req.user!.balance);
  if (balance < price) {
    res.status(400).json({ error: "Số dư không đủ. Vui lòng nạp thêm." });
    return;
  }
  const newBalance = balance - price;
  await db.update(usersTable).set({ balance: newBalance.toFixed(2) }).where(eq(usersTable.id, req.user!.id));
  await db
    .update(productsTable)
    .set({ stock: product.stock - 1, sold: product.sold + 1 })
    .where(eq(productsTable.id, product.id));
  const code = generateOrderCode();
  const inserted = await db
    .insert(ordersTable)
    .values({
      userId: req.user!.id,
      productId: product.id,
      productName: product.name,
      price: price.toFixed(2),
      status: "completed",
      code,
    })
    .returning();
  await db.insert(transactionsTable).values({
    userId: req.user!.id,
    type: "purchase",
    amount: (-price).toFixed(2),
    balanceAfter: newBalance.toFixed(2),
    description: `Mua: ${product.name}`,
  });
  const o = inserted[0]!;
  res.json({
    id: o.id,
    productId: o.productId,
    productName: o.productName,
    price: Number(o.price),
    status: o.status,
    code: o.code,
    createdAt: o.createdAt.toISOString(),
  });
});

export default router;
