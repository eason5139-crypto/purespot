import { test, expect } from "@playwright/test";

test("商城六個分類各能查看五款商品", async ({ page }) => {
  await page.goto("/shop");
  for (const name of ["主食乾糧", "主食罐頭", "鮮食餐包", "凍乾主食", "風乾主食", "機能配方"]) {
    await page.getByRole("button", { name: new RegExp(name) }).first().click();
    await expect(page.locator(".product-card")).toHaveCount(5);
  }
  await page.getByRole("button", { name: /看全部 30 款/ }).click();
  await expect(page.getByRole("button", { name: "查看更多商品" })).toBeVisible();
});
test("未登入無法讀取管理 API，並會導向後台登入", async ({ page, request }) => {
  const response = await request.get("/api/admin/products");
  expect(response.status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin-login\?next=%2Fadmin|\/admin-login\?next=\/admin/);
  await expect(page.getByRole("heading", { name: "歡迎回來" })).toBeVisible();
});
test("首頁、毛孩切換與重新整理後的資料保留", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/shop");
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
  await page.goto("/shop");
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
  await expect(page.getByRole("heading", { name: /購物袋/ })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "或以本機示範訂單快速結算 (免填地址)" })
    .click();
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
  await page
    .getByRole("button", { name: "查看 【PURESPOT】低敏原肉成貓主食凍乾" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "【PURESPOT】低敏原肉成貓主食凍乾",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "一鍵買同款" }).click();
  expect(new URL(page.url()).pathname).toBe("/community");
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
  await expect(
    page.getByRole("heading", { level: 1, name: /懂牠/ }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "開啟精準營養計算機" }).click();
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
  await page.goto("/shop");
  await expect(
    page.getByRole("heading", { name: /為麻糬的每一口/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "購物車，0 件商品" }).click();
  await expect(page.getByText("目前購物袋內尚無商品。")).toBeVisible();
});
