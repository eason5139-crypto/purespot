import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("purespot-promotions-seen-v1", "1"));
});

test("商城十六個分類各能查看五款商品", async ({ page }) => {
  await page.goto("/shop");
  for (const name of ["主食乾糧", "主食罐頭", "鮮食餐包", "凍乾主食", "風乾主食", "機能配方", "小動物主食", "零食點心", "玩具互動", "居家用品", "清潔照護", "外出用品", "飲水餐具", "舒壓嗅聞", "戶外安全", "日常保養"]) {
    await page.getByRole("button", { name: new RegExp(name) }).first().click();
    await expect(page.locator(".product-card")).toHaveCount(5);
  }
  await page.getByRole("button", { name: /看全部 80 款/ }).click();
  await expect(page.getByRole("button", { name: "查看更多商品" })).toBeVisible();
});
test("收藏、價格篩選與商品比較可以操作", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "收藏鮭魚低敏成貓糧" }).click();
  await page.getByRole("button", { name: "我的收藏 1" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("combobox", { name: "價格範圍" }).selectOption("500");
  await expect(page.getByText("沒有符合的商品")).toBeVisible();
  await page.getByRole("button", { name: "清除篩選" }).click();
  await page.getByRole("button", { name: "加入商品比較" }).first().click();
  await expect(page.getByRole("button", { name: "並排比較" })).toBeVisible();
  await page.getByRole("button", { name: "並排比較" }).click();
  await expect(page.getByRole("heading", { name: "選物比較" })).toBeVisible();
  await expect(page.getByText("規格重量")).toBeVisible();
});
test("未登入無法讀取管理 API，並會導向後台登入", async ({ page, request }) => {
  const response = await request.get("/api/admin/products");
  expect(response.status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin-login\?next=%2Fadmin|\/admin-login\?next=\/admin/);
  await expect(page.getByRole("heading", { name: "公司後台登入" })).toBeVisible();
});
test("首頁、毛孩切換與重新整理後的資料保留", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/shop");
  await expect(
    page.getByRole("heading", { name: /為麻糬的每一天/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "切換毛孩" }).click();
  await page.getByRole("menuitem", { name: /芒果/ }).click();
  await expect(
    page.getByRole("heading", { name: /為芒果的每一天/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "狗狗", exact: true }).click();
  await page.getByPlaceholder("搜尋商品或成分").fill("牛肉");
  await expect(page.getByText("過敏原警示：牛肉").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /為芒果的每一天/ }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("戰情室");
  expect(errors).toEqual([]);
});
test("份量可直接選已儲存毛孩，試算不會覆寫檔案", async ({ page }) => {
  await page.goto("/shop");
  const picker = page.getByRole("combobox", { name: "選擇已儲存的毛孩" }).first();
  await picker.selectOption("pet-mango");
  await expect(page.getByRole("heading", { name: "芒果的剛剛好份量" })).toBeVisible();
  await picker.selectOption("pet-mochi");
  await page.getByRole("button", { name: "調整我的配糧計畫" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox", { name: "選擇已儲存的毛孩" }).selectOption("pet-mango");
  await expect(dialog.getByRole("heading", { name: "芒果的專屬配糧計畫" })).toBeVisible();
  await dialog.getByRole("combobox", { name: "選擇已儲存的毛孩" }).selectOption("pet-mochi");
  const original = await page.getByTestId("daily-grams").textContent();
  const slider = dialog.getByRole("slider");
  await slider.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("daily-grams")).not.toHaveText(original!);
  await page.reload();
  await expect(page.getByRole("heading", { name: "麻糬的剛剛好份量" })).toBeVisible();
  await expect(page.getByText("4.5 公斤 · 成齡 · 已結紮")).toBeVisible();
  await page.getByRole("button", { name: "調整我的配糧計畫" }).click();
  const reopened = page.getByRole("dialog");
  await reopened.getByRole("button", { name: /依此週期設定自動循環補貨/ }).click();
  await expect(page.getByRole("heading", { name: /購物袋/ })).toBeVisible();
});

test("健康頁可直接切換已儲存毛孩", async ({ page }) => {
  await page.goto("/health");
  await page.getByRole("combobox", { name: "選擇已儲存的毛孩" }).selectOption("pet-mango");
  await expect(page.getByRole("heading", { name: "芒果的健康儀表板" })).toBeVisible();
});
test("社群公開日記可閱讀，會員操作會要求登入", async ({ page, request }) => {
  await page.route("**/api/community/posts?*", async (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ posts: [{
      id: "9f9397e1-4321-4c15-8b17-ea7c6e35fdc1",
      title: "今天的散步", body: "一起走了一段舒服的路。", imageUrl: null,
      petName: "芒果", petType: "DOG", lifeStage: "ADULT", status: "PUBLISHED",
      createdAt: new Date().toISOString(), mine: false, liked: false, saved: false,
      likesCount: 3, comments: [],
    }], nextCursor: null }),
  }));
  await page.goto("/community");
  await expect(page.getByRole("heading", { name: "同頻毛孩交流圈" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "今天的散步" })).toBeVisible();
  await page.getByRole("button", { name: "收藏這篇日記" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await request.get("/api/admin/community")).status()).toBe(401);
});
test("結帳付款方式有互動呈現，登入前不建立訂單", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "將鮭魚低敏成貓糧加入購物車" }).click();
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "結帳", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "前往填寫收件資訊" }).click();
  await page.getByRole("textbox", { name: "收件人姓名 *" }).fill("陳小姐");
  await page.getByRole("textbox", { name: "聯絡電話 *" }).fill("0912345678");
  await page.getByRole("textbox", { name: "郵遞區號 *" }).fill("100");
  await page.getByRole("textbox", { name: "縣市 *" }).fill("台北市");
  await page.getByRole("textbox", { name: "鄉鎮市區 *" }).fill("中正區");
  await page.getByRole("textbox", { name: "詳細地址 *" }).fill("仁愛路一段一號");
  await page.getByRole("button", { name: "確認收件資訊，選擇付款方式" }).click();
  await expect(page.getByRole("button", { name: "請先確認付款畫面" })).toBeDisabled();
  await page.getByRole("button", { name: /LINE Pay/ }).first().click();
  await page.getByRole("button", { name: "開啟付款畫面" }).click();
  await page.getByRole("button", { name: "確認付款", exact: true }).click();
  await expect(page.getByText("可送出訂單")).toBeVisible();
  await page.getByRole("button", { name: /信用卡/ }).first().click();
  await expect(page.getByRole("button", { name: "請先確認付款畫面" })).toBeDisabled();
  await page.getByRole("button", { name: "感應卡片" }).click();
  await page.getByRole("button", { name: "確認此筆付款" }).click();
  await expect(page.getByText("可送出訂單")).toBeVisible();
  await page.getByRole("button", { name: /ATM 轉帳/ }).click();
  await expect(page.getByText("此帳號不能匯款，請勿使用真實銀行 App 操作。")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "登入後建立訂單" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("首頁活動與社群入口可在桌機和手機使用", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#site-events")).toBeVisible();
  await expect(page.getByRole("button", { name: /本期活動/ })).toBeVisible();
  await page.getByRole("link", { name: "LINE 分享", exact: true }).click();
  await expect(page).toHaveURL(/\/community\/connect\?channel=LINE/);
  await expect(page.getByRole("button", { name: "LINE", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#site-events")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  ).toBeVisible({ timeout: 20000 });
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
    page.getByRole("heading", { name: /為麻糬的每一天/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "購物車，0 件商品" }).click();
  await expect(page.getByText("目前購物袋內尚無商品。")).toBeVisible();
});
