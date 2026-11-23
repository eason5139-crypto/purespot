import { test, expect } from "@playwright/test";
import { createMemberFixture } from "./helpers/memberV2";
const origin = "http://127.0.0.1:3000",
  headers = { Origin: origin };

test("會員券、點數、完成回饋與定期配送計畫一致", async ({ page }) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD, "需要後台測試密碼");
  test.setTimeout(150000);
  const fixture = await createMemberFixture(page.request);
  const catalog = await (await page.request.get("/api/products")).json();
  const product = catalog.products.find((p: any) => p.id === "salmon-cat");
  expect(product.stock).toBeGreaterThan(0);
  const pet = {
    id: "qa-subscription-cat",
    name: "日常檢查貓",
    type: "CAT",
    breed: "家貓",
    weightKg: 4,
    ageMonths: 24,
    isNeutered: true,
    activityLevel: "MODERATE",
    allergies: [],
    goal: "MAINTAIN",
  };
  const data = {
    idempotencyKey: crypto.randomUUID(),
    paymentMethod: "credit",
    discountCode: fixture.coupon,
    pointsToUse: 10,
    items: [{ productId: product.id, pet, quantity: 1, intervalDays: 28 }],
    shippingAddress: {
      name: "報告檢查",
      phone: "0900000000",
      postalCode: "100",
      address: "網站功能驗收用地址",
    },
  };
  const plansBefore = (await (await page.request.get("/api/autoships")).json())
    .plans.length;
  const response = await page.request.post("/api/orders/checkout", {
    headers,
    data,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const { order } = await response.json();
  const subtotal = Math.round(product.priceNt * 0.9),
    shipping = subtotal >= 699 ? 0 : 80;
  expect(order.totalNt).toBe(subtotal - 50 - 10 + shipping);
  const duplicate = await page.request.post("/api/orders/checkout", {
    headers,
    data,
  });
  expect(duplicate.ok(), await duplicate.text()).toBeTruthy();
  expect((await duplicate.json()).order.id).toBe(order.id);
  const plans = (await (await page.request.get("/api/autoships")).json()).plans;
  expect(plans).toHaveLength(plansBefore + 1);
  const plan = plans[0];
  expect(plan.status).toBe("ACTIVE");
  const paused = await page.request.patch("/api/autoships", {
    headers,
    data: { id: plan.id, revision: plan.revision, action: "pause" },
  });
  expect(paused.ok(), await paused.text()).toBeTruthy();
  const resumed = await page.request.patch("/api/autoships", {
    headers,
    data: {
      id: plan.id,
      revision: (await paused.json()).plan.revision,
      action: "resume",
    },
  });
  expect(resumed.ok(), await resumed.text()).toBeTruthy();
  const before = await (
    await page.request.get("/api/account/membership")
  ).json();
  expect(
    before.entries.some((e: any) => e.sourceKey === `order-v2:${order.id}`),
  ).toBe(false);
  const complete = await page.request.post("/api/admin/orders/complete", {
    headers,
    data: { orderIds: [order.id] },
  });
  expect(complete.ok(), await complete.text()).toBeTruthy();
  const after = await (
    await page.request.get("/api/account/membership")
  ).json();
  const reward = after.entries.find(
    (e: any) => e.sourceKey === `order-v2:${order.id}`,
  );
  expect(reward.points).toBe(Math.floor((subtotal - 60) * 0.03));
  const used = after.redemptions.find((r: any) => r.code === fixture.coupon);
  expect(used.status).toBe("USED");
  expect(after.membership.spendNt).toBe(subtotal - 60);
  const repeated = await (
    await page.request.get("/api/account/membership")
  ).json();
  expect(repeated.points).toBe(after.points);
  await page.goto("/autoship");
  await expect(
    page.getByRole("heading", { name: "我的配送計畫" }),
  ).toBeVisible();
  await page.screenshot({ path: "work/preview-autoship.png", fullPage: true });
});
