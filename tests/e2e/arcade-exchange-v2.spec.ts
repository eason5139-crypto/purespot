import { test, expect } from "@playwright/test";
import { createMemberFixture } from "./helpers/memberV2";
const check = expect.configure({ timeout: 20000 }),
  headers = { Origin: "http://127.0.0.1:3000" };
test("三種遊戲與實體點數換購可操作", async ({ page }) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD, "需要後台測試密碼");
  test.setTimeout(160000);
  await createMemberFixture(page.request);
  await page.goto("/account?tab=games");
  await check(page.getByRole("button", { name: "開啟遊戲音效" })).toBeVisible();
  await page.getByRole("button", { name: "開啟遊戲音效" }).click();
  const wheel = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/account/membership") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /立即抽/ }).click();
  check((await wheel).ok()).toBeTruthy();
  await check(
    page.getByText("貓咪轉盤中獎結果", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "work/preview-game-result.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "點數搖獎機", exact: true }).click();
  const ball = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/account/membership") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /花 .* 點搖獎/ }).click();
  check((await ball).ok()).toBeTruthy();
  await check(page.getByRole("button", { name: /花 .* 點搖獎/ })).toBeEnabled();
  await page.getByRole("button", { name: "每日刮刮樂", exact: true }).click();
  const scratch = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/account/membership") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /花 .* 點開卡刮獎/ }).click();
  check((await scratch).ok()).toBeTruthy();
  await page.getByRole("button", { name: "快速全部刮開", exact: true }).click();
  await page.screenshot({ path: "work/preview-scratch.png", fullPage: false });
  const before = await (
    await page.request.get("/api/account/membership")
  ).json();
  check(before.points).toBeGreaterThanOrEqual(55);
  const exchange = await page.request.post("/api/account/membership", {
    headers,
    data: { action: "exchange_shop", itemId: "ps-taster-salmon-freeze" },
  });
  check(exchange.ok(), await exchange.text()).toBeTruthy();
  const after = await (
    await page.request.get("/api/account/membership")
  ).json();
  check(after.points).toBe(before.points - 55);
  const pet = {
    id: "qa-gift-cat",
    name: "換購檢查貓",
    type: "CAT",
    breed: "家貓",
    weightKg: 4,
    ageMonths: 24,
    isNeutered: true,
    activityLevel: "MODERATE",
    allergies: [],
    goal: "MAINTAIN",
  };
  const response = await page.request.post("/api/orders/checkout", {
    headers,
    data: {
      idempotencyKey: crypto.randomUUID(),
      paymentMethod: "linepay",
      pointsToUse: 5,
      items: [
        { productId: "salmon-cat", pet, quantity: 1, intervalDays: null },
      ],
      shippingAddress: {
        name: "報告檢查",
        phone: "0900000000",
        postalCode: "100",
        address: "網站功能驗收用地址",
      },
    },
  });
  check(response.ok(), await response.text()).toBeTruthy();
  const order = (await response.json()).order;
  const orders = (await (await page.request.get("/api/account/orders")).json())
    .orders;
  const created = orders.find((o: any) => o.id === order.id);
  check(created.shippingAddress.pointsGifts).toHaveLength(1);
  const cancellation = await page.request.patch("/api/admin/orders", {
    headers,
    data: { orderId: order.id, status: "CANCELLED" },
  });
  check(cancellation.ok(), await cancellation.text()).toBeTruthy();
  const restored = await (
    await page.request.get("/api/account/membership")
  ).json();
  check(restored.points).toBe(after.points);
});
