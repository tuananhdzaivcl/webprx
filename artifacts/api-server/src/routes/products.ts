import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productKeysTable, productsTable } from "@workspace/db/schema";
import { asc, eq } from "drizzle-orm";

const router: IRouter = Router();

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

router.get("/products", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder));
  const prods = await db.select().from(productsTable).orderBy(asc(productsTable.id));
  const stockMap = await computeStockMap();
  const out = cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    products: prods
      .filter((p) => p.categoryId === c.id)
      .map((p) => ({
        id: p.id,
        categoryId: p.categoryId,
        categoryName: c.name,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        stock: effectiveStock(p, stockMap),
        sold: p.sold,
        imageUrl: p.imageUrl,
        active: p.active,
      })),
  }));
  res.json(out);
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID không hợp lệ" });
    return;
  }
  const found = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (found.length === 0) {
    res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    return;
  }
  const p = found[0]!;
  const cat = await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId)).limit(1);
  const stockMap = await computeStockMap();
  res.json({
    id: p.id,
    categoryId: p.categoryId,
    categoryName: cat[0]?.name ?? "",
    name: p.name,
    description: p.description,
    price: Number(p.price),
    stock: effectiveStock(p, stockMap),
    sold: p.sold,
    imageUrl: p.imageUrl,
    active: p.active,
  });
});

export default router;
