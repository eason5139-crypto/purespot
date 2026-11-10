import { test, expect } from "@playwright/test";

test("後台登入、網站即時預覽與媒體庫選圖", async ({ page }) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD, "需要後台測試密碼");

  await page.goto("/admin-login");
  await page.getByRole("textbox", { name: "管理員帳號" }).fill("Yichen");
  await page.getByLabel("密碼", { exact: true }).fill(process.env.PURESPOT_ADMIN_TEST_PASSWORD!);
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });

  await page.goto("/admin/content");
  await expect(page.getByRole("heading", { name: "網站即時預覽" })).toBeVisible();
  const title = page.getByRole("textbox", { name: "主標題前段" });
  await title.fill("今天，");
  await expect(page.frameLocator('iframe[title="手機網站預覽"]').locator("h1")).toContainText("今天，");
  await page.getByRole("button", { name: "平板" }).click();
  await expect(page.frameLocator('iframe[title="平板網站預覽"]').locator("h1")).toContainText("今天，");
  await page.getByRole("button", { name: "電腦" }).click();
  await expect(page.frameLocator('iframe[title="電腦網站預覽"]').locator("h1")).toContainText("今天，");
  await page.getByRole("button", { name: "品牌特色" }).click();
  await expect.poll(() => page.frameLocator('iframe[title="電腦網站預覽"]').locator("#our-approach").evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(12);
  await page.getByRole("button", { name: "家庭與社群" }).click();
  await page.getByRole("textbox", { name: "社群區標題" }).click();
  await expect.poll(() => page.frameLocator('iframe[title="電腦網站預覽"]').locator("#community-story").evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(12);
  await page.screenshot({ path: "test-results/admin-content-preview.png" });
  await page.getByRole("button", { name: "其他頁面文案" }).click();
  await page.getByRole("textbox", { name: "商城區塊標籤" }).fill("選物新章");
  await expect(page.frameLocator('iframe[title="電腦網站預覽"]').locator("body")).toContainText("選物新章", { timeout: 20_000 });
  await page.getByRole("button", { name: "透明資訊", exact: true }).click();
  await page.getByRole("textbox", { name: "透明資訊頁標題" }).fill("看見每個細節");
  await expect(page.frameLocator('iframe[title="電腦網站預覽"]').locator("h1")).toContainText("看見每個細節", { timeout: 20_000 });

  await page.goto("/admin/media");
  await expect(page.getByRole("heading", { name: "網站圖片管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "① 你要改哪一張？" })).toBeVisible();
  await expect(page.getByRole("button", { name: /選取圖片.*home-living-v2/ })).toBeVisible();
  await page.getByRole("button", { name: "網站內建" }).click();
  await expect(page.getByRole("button", { name: "目前已是這張照片" })).toBeDisabled();
  await page.getByRole("button", { name: /選取圖片.*shop-living-v2/ }).first().click();
  await expect(page.getByRole("button", { name: "確認更換首頁第一張大照片" })).toBeEnabled();
  await page.goto("/admin/promotions");
  await expect(page.getByRole("heading", { name: "站內活動管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "編輯活動卡片" })).toBeVisible();
  await page.goto("/admin/media");
  await page.screenshot({ path: "test-results/admin-media.png" });
  await page.goto("/admin/community");
  await expect(page.getByRole("heading", { name: "社群內容管理" })).toBeVisible();
});
