import { db } from "@workspace/db";
import {
  categoriesTable,
  productsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, newReferralCode, safeUsername } from "./auth";
import { logger } from "./logger";

const ADMIN_USERNAME = "0339651811";
const ADMIN_PASSWORD = "tuananh2011@";

export async function runStartupTasks() {
  await ensureAdmin();
  await ensureSeedCatalog();
}

async function ensureAdmin() {
  const username = safeUsername(ADMIN_USERNAME);
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) {
    if (!existing[0]!.isAdmin) {
      await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, existing[0]!.id));
    }
    return;
  }
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db.insert(usersTable).values({
    username,
    passwordHash,
    isAdmin: true,
    referralCode: newReferralCode(),
  });
  logger.info("Admin account created");
}

async function ensureSeedCatalog() {
  const existing = await db.select().from(categoriesTable);
  if (existing.length > 0) {
    await refreshProductImages();
    return;
  }

  const seedCats = [
    { name: "Proxy Aim Cổ Antenna", slug: "aim-co-antenna", sortOrder: 1 },
    { name: "Proxy AimDrag No Antenna", slug: "aimdrag-no-antenna", sortOrder: 2 },
    { name: "Aim Body Xoá Máu Vàng", slug: "aim-body-xoa-mau-vang", sortOrder: 3 },
    { name: "Nhập Key Số Lượng Lớn", slug: "nhap-key-sl-lon", sortOrder: 4 },
  ];
  const insertedCats = await db.insert(categoriesTable).values(seedCats).returning();
  const catBySlug: Record<string, number> = {};
  for (const c of insertedCats) catBySlug[c.slug] = c.id;

  const base = "/";
  const products = [
    {
      categoryId: catBySlug["aim-co-antenna"]!,
      name: "Aim Cổ Antenna 1 Day",
      description: "Proxy Aim Cổ Antenna - thời hạn 1 ngày",
      price: "20000.00",
      stock: 29,
      sold: 31,
      imageUrl: `${base}product-aim-co-antenna.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aim-co-antenna"]!,
      name: "Aim Cổ Antenna 2 Tuần",
      description: "Proxy Aim Cổ Antenna - thời hạn 2 tuần",
      price: "50000.00",
      stock: 27,
      sold: 38,
      imageUrl: `${base}product-aim-co-antenna.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aim-co-antenna"]!,
      name: "Aim Cổ Antenna 1 Tháng",
      description: "Proxy Aim Cổ Antenna - thời hạn 1 tháng",
      price: "90000.00",
      stock: 48,
      sold: 3,
      imageUrl: `${base}product-aim-co-antenna.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aimdrag-no-antenna"]!,
      name: "AimDrag No Antenna 1 Day",
      description: "Proxy AimDrag No Antenna - 1 ngày",
      price: "20000.00",
      stock: 50,
      sold: 74,
      imageUrl: `${base}product-aimdrag.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aimdrag-no-antenna"]!,
      name: "AimDrag No Antenna 2 Tuần",
      description: "Proxy AimDrag No Antenna - 2 tuần",
      price: "50000.00",
      stock: 50,
      sold: 69,
      imageUrl: `${base}product-aimdrag.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aimdrag-no-antenna"]!,
      name: "AimDrag No Antenna 1 Tháng",
      description: "Proxy AimDrag No Antenna - 1 tháng",
      price: "90000.00",
      stock: 32,
      sold: 36,
      imageUrl: `${base}product-aimdrag.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aim-body-xoa-mau-vang"]!,
      name: "Aim Body 1 Ngày",
      description: "Aim Body xoá máu vàng - 1 ngày",
      price: "20000.00",
      stock: 40,
      sold: 10,
      imageUrl: `${base}product-aim-body.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aim-body-xoa-mau-vang"]!,
      name: "Aim Body 2 Tuần",
      description: "Aim Body xoá máu vàng - 2 tuần",
      price: "50000.00",
      stock: 42,
      sold: 8,
      imageUrl: `${base}product-aim-body.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["aim-body-xoa-mau-vang"]!,
      name: "Aim Body 1 Tháng",
      description: "Aim Body xoá máu vàng - 1 tháng",
      price: "90000.00",
      stock: 50,
      sold: 0,
      imageUrl: `${base}product-aim-body.svg`,
      active: true,
    },
    {
      categoryId: catBySlug["nhap-key-sl-lon"]!,
      name: "Sỉ SLL Key Proxy 1 Tháng",
      description: "Sỉ số lượng lớn key proxy - 1 tháng",
      price: "270000.00",
      stock: 0,
      sold: 0,
      imageUrl: `${base}product-bulk-key.svg`,
      active: true,
    },
  ];
  await db.insert(productsTable).values(products);
  logger.info("Seed catalog inserted");
}

async function refreshProductImages() {
  const all = await db.select().from(productsTable);
  const cats = await db.select().from(categoriesTable);
  const slugById: Record<number, string> = {};
  for (const c of cats) slugById[c.id] = c.slug;
  const map: Record<string, string> = {
    "aim-co-antenna": "/product-aim-co-antenna.svg",
    "aimdrag-no-antenna": "/product-aimdrag.svg",
    "aim-body-xoa-mau-vang": "/product-aim-body.svg",
    "nhap-key-sl-lon": "/product-bulk-key.svg",
  };
  for (const p of all) {
    const slug = slugById[p.categoryId];
    if (!slug) continue;
    const want = map[slug];
    if (!want || p.imageUrl === want) continue;
    await db
      .update(productsTable)
      .set({ imageUrl: want })
      .where(eq(productsTable.id, p.id));
  }
}
