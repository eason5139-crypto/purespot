import { expect, test } from "@playwright/test";

test("安心選物可以按毛孩、食物用品與分類找到有圖片的商品", async ({ page }) => {
  await page.goto("/transparency");
  await expect(page.getByRole("link", { name: "安心選物" })).toBeVisible();
  await expect(page.getByRole("link", { name: "毛孩社群" })).toBeVisible();

  const records = page.getByTestId("transparency-product-records");
  await expect(records.getByRole("img", { name: /商品照片/ }).first()).toBeVisible();
  await records.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/transparency-records-desktop.png" });
  await records.getByRole("group", { name: "依毛孩種類篩選商品" }).getByRole("button", { name: "狗狗" }).click();
  await records.getByRole("group", { name: "依食物或用品篩選商品" }).getByRole("button", { name: "用品" }).click();
  await records.getByRole("combobox", { name: "商品分類" }).selectOption("玩具互動");
  await expect(records.getByRole("status")).toContainText("款商品");
  await expect(records.getByRole("img", { name: /商品照片/ }).first()).toBeVisible();
  await expect(records.getByText("粗蛋白")).toHaveCount(0);

  await records.getByRole("button", { name: "清除篩選" }).click();
  await records.getByPlaceholder("例如：鮭魚、凍乾、貓窩").fill("鮭魚");
  await expect(records.getByRole("status")).toContainText("找到");
  await expect(records.getByRole("heading", { name: /鮭魚/ }).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await records.getByRole("button", { name: "清除篩選" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await records.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/transparency-records-mobile.png" });
});
