import { test, expect } from "@playwright/test";
test("首頁、毛孩切換與重新整理後的資料保留", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /為麻糬的每一口/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "切換毛孩" }).click();
  await page.getByRole("menuitem", { name: /芒果/ }).click();
  await expect(
    page.getByRole("heading", { name: /為芒果的每一口/ }),
  ).toBeVisible();
  await expect(page.getByText("過敏原警示：牛肉")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /為芒果的每一口/ }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("戰情室");
  expect(errors).toEqual([]);
});
test("配糧即時換算、循環加車、示範結帳與計畫順延", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "調整我的配糧計畫" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const original = await page.getByTestId("daily-grams").textContent();
  const slider = dialog.getByRole("slider");
  await slider.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("daily-grams")).not.toHaveText(original!);
  await dialog
    .getByRole("button", { name: /依此週期設定自動循環補貨/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "毛孩的購物袋" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "建立示範訂單" }).click();
  await expect(
    page.getByRole("heading", { name: "示範訂單已建立" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "查看我的循環補貨" }).click();
  await expect(
    page.getByRole("heading", { name: "我的循環補貨", exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("purespot-demo-autoship")!).state.plans[0]
        .nextDeliveryDate as string,
  );
  await page.getByRole("button", { name: "順延 7 天" }).click();
  const after = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("purespot-demo-autoship")!).state.plans[0]
        .nextDeliveryDate as string,
  );
  expect(new Date(after).getTime() - new Date(before).getTime()).toBe(
    7 * 86400000,
  );
  await page.getByRole("button", { name: "暫停計畫" }).click();
  await expect(page.getByRole("button", { name: "順延 7 天" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "恢復計畫" })).toBeVisible();
});
test("社群抽屜原地加車，過敏品無法誤購", async ({ page }) => {
  await page.goto("/community");
  await page.getByRole("button", { name: /開飯時間/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "把同款加入購物車" }).click();
  expect(new URL(page.url()).pathname).toBe("/community");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /開飯時間/ })).toBeFocused();
  await expect(
    page.getByRole("button", { name: "購物車，1 件商品" }),
  ).toBeVisible();
  await page.goto("/products/chicken-cat");
  await expect(page.getByText("過敏原警示：雞肉")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "單次加入購物車" }),
  ).toBeDisabled();
});
test("TradingView 指標切換與離開重掛載無錯誤", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (let i = 0; i < 3; i++) {
    await page.goto("/products/salmon-cat");
    await expect(page.locator("canvas").first()).toBeVisible();
    await page.getByRole("button", { name: /水份/ }).click();
    await expect(page.getByText("虛線：最高保證值 10%")).toBeVisible();
    await page.getByRole("button", { name: /灰分/ }).click();
    await page.getByText("查看批次明細與資料說明").click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.getByRole("link", { name: "PURESPOT 首頁" }).click();
  }
  expect(errors).toEqual([]);
});
test("390 像素手機版沒有水平溢位，導覽與試算可操作", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "開啟導覽選單" }).click();
  await page.getByRole("menuitem", { name: "健康儀表板" }).click();
  await expect(
    page.getByRole("heading", { name: "麻糬的健康儀表板" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "更新我的配糧計畫" }).click();
  await expect(page.getByRole("slider")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("損壞的儲存資料不造成閃退", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "purespot-pet-context",
      JSON.stringify({
        version: 1,
        state: { allPets: [], activePetId: "ghost" },
      }),
    );
    localStorage.setItem("purespot-cart", "{broken");
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /為麻糬的每一口/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "購物車，0 件商品" }).click();
  await expect(
    page.getByRole("heading", { name: "購物袋還空著" }),
  ).toBeVisible();
});
