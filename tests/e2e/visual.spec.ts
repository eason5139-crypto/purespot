import { test, expect } from "@playwright/test";

async function revealAnimatedSections(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 400);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(700);
  await page.addStyleTag({
    content: 'main [style*="opacity"] { opacity: 1 !important; }',
  });
}

test("擷取桌機、手機、試算與商品詳情畫面", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { level: 1, name: /懂牠/ }),
  ).toBeVisible();
  await page.evaluate(() => {
    for (const img of Array.from(document.images)) img.loading = "eager";
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  await revealAnimatedSections(page);
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "試算每日份量" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/screenshots/calculator.png" });
  await page.keyboard.press("Escape");
  await page.goto("/shop", { waitUntil: "networkidle" });
  await page.screenshot({ path: "docs/screenshots/shop.png", fullPage: true });
  await page.goto("/products/salmon-cat", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("region", { name: "商品批次檢驗數據" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("region", { name: "商品批次檢驗數據" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "docs/screenshots/product.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { level: 1, name: /懂牠/ }),
  ).toBeVisible();
  await page.evaluate(() => {
    for (const img of Array.from(document.images)) img.loading = "eager";
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: "docs/screenshots/mobile-cover.png" });
  await revealAnimatedSections(page);
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
});
