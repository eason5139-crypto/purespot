import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

function testDatabase() {
  const line = readFileSync(".env", "utf8").split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  const url = line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
  return new PrismaClient({ datasources: { db: { url } } });
}

test("會員帳戶的地址、收藏、照顧與訂單資料保持同步", async ({ page }) => {
  const db = testDatabase();
  const email = `account-check-${randomUUID()}@example.test`;
  let userId = "";
  let orderId = "";
  try {
    const register = await page.request.post("/api/auth", { data: { action: "register", email, password: "Test-Only-Account-2026!", name: "驗證會員" } });
    expect(register.status()).toBe(201);
    userId = (await register.json()).user.id;
    const product = await db.product.findFirstOrThrow({ where: { isPublished: true }, include: { variants: { take: 1 } } });
    const variant = product.variants[0];
    if (!variant) throw new Error("Published product has no variant");
    const pet = await db.pet.create({ data: { userId, name: "測試毛孩", type: product.targetPetType, breed: "混種", isNeutered: true, birthday: new Date("2023-01-01"), weightKg: 4, activityLevel: "MODERATE", allergies: [], chronicDiseases: [] } });

    const address = await page.request.post("/api/account/addresses", { data: { label: "住家", name: "測試會員", phone: "0912345678", postalCode: "100", city: "臺北市", district: "中正區", address: "仁愛路一段一號", note: "", isDefault: true } });
    expect(address.status()).toBe(201);
    const savedAddress = (await address.json()).address;
    expect((await (await page.request.get("/api/account/addresses")).json()).addresses[0].id).toBe(savedAddress.id);

    expect((await page.request.put("/api/account/preferences", { data: { orderUpdates: true, refillReminders: false, restockAlerts: true, careReminders: true } })).ok()).toBe(true);
    expect((await (await page.request.get("/api/account/preferences")).json()).preferences.refillReminders).toBe(false);

    expect((await page.request.post("/api/account/favorites", { data: { productId: product.id } })).status()).toBe(201);
    expect((await page.request.patch("/api/account/favorites", { data: { productId: product.id, petId: pet.id, watchRestock: true } })).ok()).toBe(true);
    const favorites = (await (await page.request.get("/api/account/favorites")).json()).favorites;
    expect(favorites[0]).toMatchObject({ productId: product.id, petId: pet.id, watchRestock: true });

    expect((await page.request.post("/api/account/care", { data: { action: "record", petId: pet.id, kind: "WEIGHT", note: "例行量測", weightKg: 4.2 } })).status()).toBe(201);
    expect((await db.pet.findUniqueOrThrow({ where: { id: pet.id } })).weightKg).toBe(4.2);
    expect((await page.request.post("/api/account/care", { data: { action: "reminder", petId: pet.id, title: "量體重", dueAt: new Date(Date.now() + 86400000).toISOString(), repeatDays: 7 } })).status()).toBe(201);
    expect((await (await page.request.get("/api/account/rhythm")).json()).cards).toHaveLength(1);

    const createdOrder = await db.order.create({ data: { userId, status: "PAID", subtotalNt: variant.priceNt, shippingNt: 0, totalNt: variant.priceNt, idempotencyKey: randomUUID(), requestHash: "account-check", shippingAddress: { name: "測試會員", phone: "0912345678", postalCode: "100", address: "臺北市中正區仁愛路一段一號" }, paymentReference: `check-${randomUUID()}`, expiresAt: new Date(Date.now() + 86400000), items: { create: { variantId: variant.id, petId: pet.id, productName: product.name, unitPriceNt: variant.priceNt, quantity: 1 } } } });
    orderId = createdOrder.id;
    expect((await (await page.request.get("/api/account/orders")).json()).orders.some((order: { id: string }) => order.id === orderId)).toBe(true);
    expect((await page.request.post("/api/account/support", { data: { orderId, kind: "ISSUE", message: "測試售後需求內容與訂單連結。" } })).status()).toBe(201);

    await page.goto("/account?tab=settings");
    await expect(page.getByRole("heading", { name: "收件與通知" })).toBeVisible();
    await expect(page.getByText("臺北市中正區仁愛路一段一號")).toBeVisible();
    await page.getByRole("button", { name: "雲端收藏" }).click();
    await expect(page.getByRole("heading", { name: "雲端收藏" })).toBeVisible();
    await page.getByRole("button", { name: "照顧紀錄" }).click();
    await page.getByRole("button", { name: "測試毛孩" }).last().click();
    await expect(page.getByText("例行量測")).toBeVisible();
    await page.getByRole("button", { name: "完整訂單" }).click();
    await expect(page.getByText(orderId.slice(0, 8), { exact: false })).toBeVisible();
  } finally {
    if (orderId) await db.order.deleteMany({ where: { id: orderId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});
