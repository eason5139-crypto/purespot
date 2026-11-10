import { expect, test } from "@playwright/test";

test("成分放大鏡可逐層閱讀與並排比較，展示批次不冒充正式報告", async ({ page }) => {
  await page.goto("/care/ingredients");
  await expect(page.getByRole("heading", { name: "從一張照片，" })).toBeVisible();
  await page.getByRole("button", { name: "查看02 過敏原" }).click();
  await expect(page.getByText("替敏感毛孩多看一眼")).toBeVisible();
  await page.getByRole("button", { name: "查看03 批次" }).click();
  await expect(page.getByText("目前沒有可供正式核實的批次報告。")).toBeVisible();
  await page.getByRole("button", { name: "查看01 配方" }).click();
  await page.getByLabel("選擇比較商品").selectOption({ index: 1 });
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("link", { name: "查看全部商品資訊" }).click();
  await expect(page).toHaveURL(/transparency/, { timeout: 30000 });
});

test("旅前打包桌可點選、勾選、儲存並重新載入", async ({ page }) => {
  await page.goto("/care/packing");
  await page.getByRole("button", { name: /隨行飲水/ }).click();
  await page.getByRole("button", { name: /鼓勵小點心/ }).click();
  await page.getByRole("button", { name: /清潔與便袋/ }).click();
  await page.getByRole("checkbox", { name: /隨行飲水/ }).check();
  await page.getByRole("button", { name: "儲存計畫" }).click();
  await expect(page.getByText("已儲存的行程")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /隨行飲水/ })).toBeChecked();
  await expect(page.getByText("已裝好 1/3")).toBeVisible();
});

test("打包清單可拖曳並以連結交給家人另存", async ({ page, context, browser }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/care/packing");
  await expect(page.getByRole("button", { name: "儲存計畫" })).toBeEnabled();
  await page.getByRole("button", { name: /隨行飲水/ }).scrollIntoViewIfNeeded();
  const source = await page.getByRole("button", { name: /隨行飲水/ }).boundingBox();
  const target = await page.getByRole("region", { name: "我的打包清單" }).boundingBox();
  expect(source && target).toBeTruthy();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(source!.x + source!.width / 2 + 20, source!.y + source!.height / 2 + 20, { steps: 5 });
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole("checkbox", { name: /隨行飲水/ })).toBeVisible();
  await page.getByRole("textbox", { name: "計畫名稱" }).fill("周末公園行程");
  await page.getByRole("button", { name: "分享給家人" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("/care/packing?plan=");
  const familyContext = await browser.newContext();
  const familyPage = await familyContext.newPage();
  await familyPage.goto(link);
  await expect(familyPage.getByRole("textbox", { name: "計畫名稱" })).toHaveValue("周末公園行程 · 家人分享");
  await expect(familyPage.getByRole("checkbox", { name: /隨行飲水/ })).toBeVisible();
  await familyContext.close();
});

test("探索測驗與 LINE 分享工作室能完成站內流程", async ({ page }) => {
  await page.goto("/care/missions");
  await page.getByRole("button", { name: "保證分析標示的最低值" }).click();
  await page.getByRole("button", { name: "下一題" }).click();
  await page.getByRole("button", { name: "查看成分與已知過敏原，並核對包裝" }).click();
  await page.getByRole("button", { name: "下一題" }).click();
  await page.getByRole("button", { name: "先看展示，正式批次仍需來源核實" }).click();
  await page.getByRole("button", { name: "看結果" }).click();
  await expect(page.getByText("三題全對，探索完成！")).toBeVisible();
  await page.goto("/community/connect");
  await page.getByRole("button", { name: "LINE", exact: true }).click();
  await page.getByRole("button", { name: "旅前打包桌" }).click();
  await page.getByRole("textbox", { name: "分享文案" }).fill("一起準備明天的毛孩行程！");
  await page.getByRole("button", { name: "更新預覽" }).click();
  await expect(page.getByText("預覽已更新，可以儲存草稿或複製分享。")).toBeVisible();
  await page.getByRole("button", { name: "儲存草稿" }).click();
  await expect(page.getByText("LINE · 旅前打包桌")).toBeVisible();
  await expect(page.getByText("不會代替你登入，也不會自動發文或發訊息", { exact: false })).toBeVisible();
});
