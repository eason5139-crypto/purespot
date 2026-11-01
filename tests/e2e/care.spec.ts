import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("照顧工具導覽、選物避開過敏原並可加入購物袋", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/care");
  await expect(page.getByRole("heading", { name: "選物實驗室" })).toBeVisible();
  await page.getByRole("link", { name: /選物實驗室/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "選物實驗室" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "搜尋選物" }).fill("鮮雞全齡貓糧");
  await expect(page.getByText("目前沒有符合條件的商品")).toBeVisible();
  await page.getByRole("textbox", { name: "搜尋選物" }).fill("鮭魚低敏成貓糧");
  await expect(
    page.getByRole("link", { name: "鮭魚低敏成貓糧", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "比較鮭魚低敏成貓糧" }).click();
  await expect(page.getByRole("region", { name: "選物比較" })).toBeVisible();
  await page
    .getByRole("button", { name: "將鮭魚低敏成貓糧加入購物袋" })
    .click();
  await expect(
    page.getByRole("button", { name: "購物車，1 件商品" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "選擇已儲存的毛孩" })
    .selectOption("pet-mango");
  await expect(
    page.getByRole("link", { name: "鮭魚低敏成貓糧", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("補貨天氣依包數與共食毛孩變動，儲存後重新整理保留", async ({ page }) => {
  await page.goto("/care/refill");
  await expect(
    page.getByRole("heading", { name: "補貨天氣預報" }),
  ).toBeVisible();
  await page.getByRole("spinbutton", { name: "未開封包數" }).fill("2");
  await page.getByRole("spinbutton", { name: "已開封剩餘克數" }).fill("500");
  await expect(page.getByText("現有 4,500 克", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "儲存存量" }).click();
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "未開封包數" }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("spinbutton", { name: "已開封剩餘克數" }),
  ).toHaveValue("500");
  await expect(
    page.getByRole("button", { name: "加入我的行事曆" }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "加入我的行事曆" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(
    /^purespot-refill-\d{4}-\d{2}-\d{2}\.ics$/,
  );
  const calendar = await readFile((await download.path())!, "utf8");
  expect(calendar).toContain("BEGIN:VEVENT");
  expect(calendar).toContain("DTSTART;VALUE=DATE:");
  await page.getByRole("spinbutton", { name: "已開封剩餘克數" }).fill("99999");
  await expect(page.getByRole("button", { name: "儲存存量" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("新增同物種毛孩後，共食會縮短預估天數", async ({ page }) => {
  await page.goto("/care/refill");
  await expect(
    page.getByRole("heading", { name: "補貨天氣預報" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "切換毛孩" }).click();
  await page.getByRole("menuitem", { name: "管理毛孩資料" }).click();
  const editor = page.getByRole("dialog");
  await editor.getByRole("button", { name: "新增毛孩" }).click();
  await editor.getByRole("textbox", { name: "毛孩名稱" }).fill("豆包");
  await editor.getByRole("button", { name: "儲存毛孩資料" }).click();
  await page
    .getByRole("combobox", { name: "選擇已儲存的毛孩" })
    .selectOption("pet-mochi");
  const before = Number(
    (await page.locator("strong.editorial-title").textContent())?.replaceAll(
      ",",
      "",
    ),
  );
  await page.getByRole("checkbox", { name: "豆包" }).check();
  const after = Number(
    (await page.locator("strong.editorial-title").textContent())?.replaceAll(
      ",",
      "",
    ),
  );
  expect(after).toBeLessThan(before);
  await page.getByRole("button", { name: "儲存存量" }).click();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "豆包" })).toBeChecked();
});

test("換糧日程與每日觀察保存，改日程時要求確認", async ({ page }) => {
  await page.goto("/care/transition");
  await page.getByRole("textbox", { name: "目前吃的食物" }).fill("原本的主食");
  await page.getByRole("button", { name: "儲存日程" }).click();
  await page.getByRole("button", { name: "後一天" }).click();
  await expect(
    page.getByRole("heading", { name: "第 2 天的餐桌" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "稍差" }).click();
  await page.getByRole("textbox", { name: "觀察備註" }).fill("吃得慢一些");
  await page.getByRole("button", { name: "儲存今天的觀察" }).click();
  await page.reload();
  await page.getByRole("button", { name: "後一天" }).click();
  await expect(page.getByRole("button", { name: "稍差" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("textbox", { name: "觀察備註" })).toHaveValue(
    "吃得慢一些",
  );
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("combobox", { name: "安排幾天" }).selectOption("14");
  await page.getByRole("button", { name: "儲存日程" }).click();
  await expect(page.getByRole("combobox", { name: "安排幾天" })).toHaveValue(
    "14",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
