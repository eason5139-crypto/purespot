import { test, expect } from "@playwright/test";

test("選物羅盤排除過敏商品、比較並加入購物袋", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/care/compass");
  await expect(
    page.getByRole("heading", { level: 1, name: "選物羅盤" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "找到三種提案" }).click();
  await expect(
    page.getByRole("heading", { name: "給麻糬的選物提案" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "加入購物袋" })).toHaveCount(3);
  await expect(page.getByRole("link", { name: "鮮雞全齡貓糧" })).toHaveCount(0);
  await page.getByRole("button", { name: "比較" }).nth(0).click();
  await page.getByRole("button", { name: "比較" }).nth(1).click();
  await expect(
    page.getByRole("region", { name: "選物並排比較" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "加入購物袋" }).first().click();
  await expect(
    page.getByRole("button", { name: "購物車，1 件商品" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "選擇已儲存的毛孩" })
    .selectOption("pet-mango");
  await expect(
    page.getByRole("heading", { name: "給麻糬的選物提案" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
