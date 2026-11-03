import { test, expect } from "@playwright/test";

test("訪客可瀏覽、關閉並重新打開站內活動", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "PURESPOT 站內活動" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toContainText("為牠，挑一件剛剛好的日常");
  await dialog.getByRole("button", { name: "下一張活動" }).click();
  await expect(dialog.getByRole("heading")).toContainText("毛孩的故事");
  await dialog.getByRole("button", { name: "關閉站內活動" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "看看站內活動" }).click();
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "看看站內活動" })).toBeVisible();
});
