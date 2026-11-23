import { test, expect } from "@playwright/test";

test("首頁活動、商品比較與五項導覽可直接使用", async ({ page }) => {
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "本期活動" });
  await expect(carousel).toBeVisible();
  expect((await carousel.boundingBox())!.y).toBeLessThan(170);
  await expect(page.getByRole("dialog", { name: "PURESPOT 站內活動" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "主要導覽", exact: true }).getByRole("link")).toHaveText(["首頁", "選物本舖", "點數商店", "毛孩生活圈", "定期配送"]);
  const title = carousel.locator("h2").last();
  const original = await title.innerText();
  await expect(title).not.toHaveText(original, { timeout: 9000 });
  await carousel.getByRole("button", { name: "暫停活動輪播" }).click();
  await expect(carousel.getByRole("button", { name: "播放活動輪播" })).toHaveAttribute("aria-pressed", "true");
  await carousel.getByRole("button", { name: "上一張活動" }).click();
  await page.getByRole("button", { name: "會員選單" }).click();
  await expect(page.getByRole("menuitem", { name: "照顧工具" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "成分與批次資料" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "登入或建立帳戶" })).toBeVisible();
  await page.keyboard.press("Escape");
  const comparison = page.getByRole("region", { name: "商品比較桌" });
  const first = comparison.getByLabel("第一款商品", { exact: true });
  const options = await first.locator("option").evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
  await first.selectOption(options[2]!);
  await expect(first).toHaveValue(options[2]!);
  const second = comparison.getByLabel("第二款商品", { exact: true });
  expect(await first.inputValue()).not.toEqual(await second.inputValue());
  const add = comparison.getByRole("button", { name: /加入購物車/ }).first();
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByRole("button", { name: /購物車，1 件商品/ })).toBeVisible();
  for (const width of [390, 820, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("活動後台的草稿預覽、停用、排序與儲存會同步到首頁", async ({ page }) => {
  const request = page.request;
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD, "需要後台測試密碼");
  const login = await request.post("/api/admin/session", { headers: { Origin: "http://127.0.0.1:3000" }, data: { username: "Yichen", password: process.env.PURESPOT_ADMIN_TEST_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const original = (await (await request.get("/api/admin/content")).json()).content;
  try {
    await page.goto("/admin/promotions");
    await expect(page.getByRole("heading", { name: "首頁活動即時預覽" })).toBeVisible();
    await page.getByRole("textbox", { name: "標題", exact: true }).fill("這週一起出門走走");
    const preview = page.getByRole("complementary", { name: "活動即時預覽" });
    await expect(preview.locator(".activity-copy h2")).toHaveText("這週一起出門走走");
    await page.getByRole("button", { name: "手機", exact: true }).click();
    await expect(preview.locator(".activity-copy h2")).toBeVisible();
    await page.getByRole("button", { name: "平板", exact: true }).click();
    await expect(preview.locator(".activity-copy h2")).toHaveText("這週一起出門走走");
    await page.getByRole("button", { name: "電腦", exact: true }).click();
    await page.getByLabel("輪播秒數").selectOption("7");
    await page.getByRole("button", { name: "儲存活動", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("首頁活動輪播已更新");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "標題", exact: true })).toHaveValue("這週一起出門走走");
    await page.goto("/");
    await expect(page.locator(".activity-copy h2")).toHaveText("這週一起出門走走");
    const saved = (await (await request.get("/api/admin/content")).json()).content;
    expect(saved.promotionIntervalSeconds).toBe(7);
    await page.goto("/admin/promotions");
    await page.getByRole("checkbox", { name: "在首頁顯示這張活動" }).uncheck();
    await page.getByRole("button", { name: "向後移動" }).click();
    await page.getByRole("button", { name: "儲存活動", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("已儲存");
    await page.goto("/");
    await expect(page.locator(".activity-copy h2")).not.toHaveText("這週一起出門走走");
  } finally {
    const restored = await request.put("/api/admin/content", { headers: { Origin: "http://127.0.0.1:3000" }, data: original });
    expect(restored.ok()).toBeTruthy();
  }
});
