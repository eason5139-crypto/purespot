import { test, expect } from "@playwright/test";
test("擷取桌機、手機、試算與商品詳情畫面", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.locator(".hero-panel + section .font-mono").first(),
  ).toHaveCSS("opacity", "1");
  await page.evaluate(() => {
    for (const img of Array.from(document.images)) img.loading = "eager";
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "調整我的配糧計畫" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/screenshots/calculator.png" });
  await page.keyboard.press("Escape");
  await page.goto("/products/salmon-cat", { waitUntil: "networkidle" });
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/product.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.locator(".hero-panel + section .font-mono").first(),
  ).toHaveCSS("opacity", "1");
  await page.evaluate(() => {
    for (const img of Array.from(document.images)) img.loading = "eager";
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  await page.screenshot({ path: "docs/screenshots/mobile-cover.png" });
});
