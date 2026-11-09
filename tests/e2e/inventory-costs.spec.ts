import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

function testDatabase() {
  const line = readFileSync(".env", "utf8").split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  return new PrismaClient({ datasources: { db: { url: line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "") } } });
}

function draftProduct(name: string, unitCostNt: number) {
  return {
    name, subtitle: "庫存流程驗證商品", type: "DOG", kind: "SUPPLIES", category: "玩具互動",
    priceNt: 500, unitCostNt, costSource: "MANUAL", stock: 0, bagGrams: 100,
    kcalPer100g: 0, proteinMin: 0, moistureMax: 0, ashMax: 0,
    image: "/images/products-photo/cat-feather-toy.webp", gallery: [], videoUrl: "",
    description: "只用來驗證後台庫存與成本資料串接的暫存商品。",
    ingredients: [], allergens: [], lifeStages: ["ADULT"], autoshipEligible: false,
    isPublished: false, color: "blue",
  };
}

test("批次進貨、耗損與營運成本使用同一份流水", async ({ page }) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD, "需要後台測試密碼");
  const db = testDatabase();
  const productIds: string[] = [];
  try {
    await page.goto("/admin-login");
    await page.getByRole("textbox", { name: "管理員帳號" }).fill("Yichen");
    await page.getByLabel("密碼", { exact: true }).fill(process.env.PURESPOT_ADMIN_TEST_PASSWORD!);
    await page.getByRole("button", { name: "登入", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);

    const before = await (await page.request.get("/api/admin/inventory")).json();
    const first = await page.request.post("/api/admin/products", { data: draftProduct(`驗證玩具甲${randomUUID().slice(0, 6)}`, 200) });
    expect(first.status(), await first.text()).toBe(201);
    const firstId = (await first.json()).product.id as string;
    productIds.push(firstId);
    const second = await page.request.post("/api/admin/products", { data: draftProduct(`驗證玩具乙${randomUUID().slice(0, 6)}`, 150) });
    expect(second.status(), await second.text()).toBe(201);
    const secondId = (await second.json()).product.id as string;
    productIds.push(secondId);

    const batch = await page.request.post("/api/admin/inventory", { data: { items: [
      { productId: firstId, delta: 3, type: "restock", note: "驗證批次" },
      { productId: secondId, delta: 4, type: "restock", note: "驗證批次" },
    ] } });
    expect(batch.status(), await batch.text()).toBe(200);
    expect((await batch.json()).estimatedTotalNt).toBe(1200);
    const loss = await page.request.patch(`/api/admin/products/${firstId}/stock`, { data: { delta: -1, type: "deduction", note: "驗證耗損" } });
    expect(loss.status(), await loss.text()).toBe(200);
    const correction = await page.request.patch(`/api/admin/products/${secondId}/stock`, { data: { delta: -1, type: "adjustment", note: "驗證盤點" } });
    expect(correction.status(), await correction.text()).toBe(200);

    const after = await (await page.request.get("/api/admin/inventory")).json();
    expect(after.spending.procurementNt - before.spending.procurementNt).toBe(1200);
    expect(after.spending.lossNt - before.spending.lossNt).toBe(350);
    expect(after.spending.totalNt - before.spending.totalNt).toBe(1550);
    expect(after.logs.filter((entry: { productId: string }) => productIds.includes(entry.productId))).toHaveLength(4);
    const analytics = await (await page.request.get("/api/admin/analytics?abcDays=30")).json();
    expect(analytics.inventorySpending.totalNt).toBe(after.spending.totalNt);

    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "批次進貨表" })).toBeVisible();
    await expect(page.getByText("本月庫存成本負擔")).toBeVisible();
    await page.goto("/admin/analytics");
    await page.getByRole("button", { name: "商品 ABC 分析" }).click();
    await expect(page.getByRole("heading", { name: "商品 ABC 與毛利分析" })).toBeVisible();
  } finally {
    if (productIds.length) {
      const variants = await db.productVariant.findMany({ where: { productId: { in: productIds } }, select: { id: true } });
      await db.stockMovement.deleteMany({ where: { variantId: { in: variants.map((variant) => variant.id) } } });
      await db.product.deleteMany({ where: { id: { in: productIds } } });
    }
    await db.$disconnect();
  }
});
