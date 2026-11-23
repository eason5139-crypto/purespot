import { test, expect } from "@playwright/test";
import { DEFAULT_SURVEYS } from "../../src/lib/surveys";
import fs from "node:fs";
const verify = expect.configure({ timeout: 20000 });
const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
test("會員五等、獎勵去重、問卷統計及分頁完整串聯", async ({
  page,
  browser,
}) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD, "需要後台測試密碼");
  test.setTimeout(240000);
  const visitor = await browser.newContext();
  verify(
    (await visitor.request.get("/api/surveys/pet-preferences")).status(),
  ).toBe(401);
  await visitor.close();
  const email = `experience-${Date.now()}@example.test`;
  const signup = await page.request.post("/api/auth", {
    headers,
    data: {
      action: "register",
      email,
      password: "PURESPOT-QA-2026!",
      name: "體驗改版檢查",
    },
  });
  verify(signup.status(), await signup.text()).toBe(201);
  const first = await (
    await page.request.get("/api/account/membership")
  ).json();
  verify(first.membership.policy.tiers.map((x: any) => x.earnPercent)).toEqual([
    3, 5, 9, 12, 15,
  ]);
  verify(first.membership.current.code).toBe("MEMBER");
  const admin = await page.request.post("/api/admin/session", {
    headers,
    data: {
      username: "Yichen",
      password: process.env.PURESPOT_ADMIN_TEST_PASSWORD,
    },
  });
  verify(admin.ok(), await admin.text()).toBeTruthy();
  const id = `qa-${Date.now()}`;
  const definition = {
    ...structuredClone(DEFAULT_SURVEYS[0]!),
    id,
    title: "會員改版流程驗收",
    reward: { ...DEFAULT_SURVEYS[0]!.reward, points: 37 },
  };
  const saved = await page.request.put("/api/admin/surveys", {
    headers,
    data: definition,
  });
  verify(saved.ok(), await saved.text()).toBeTruthy();
  const survey = (await saved.json()).survey;
  const answers = {
    species: ["o1"],
    priority: "o1",
    shopping: "o2",
    autoship: "o2",
    frequency: "ignored",
  };
  const invalid = await page.request.post(`/api/surveys/${id}`, {
    headers,
    data: { version: survey.version, answers: {} },
  });
  verify(invalid.status()).toBe(400);
  const submissions = await Promise.all(
    [1, 2].map(() =>
      page.request.post(`/api/surveys/${id}`, {
        headers,
        data: { version: survey.version, answers },
      }),
    ),
  );
  verify(submissions.map((r) => r.status()).sort()).toEqual([200, 409]);
  const after = await (
    await page.request.get("/api/account/membership")
  ).json();
  verify(after.points - first.points).toBe(37);
  const result = await (
    await page.request.get(`/api/admin/surveys?id=${id}`)
  ).json();
  verify(result.responses).toHaveLength(1);
  verify(result.responses[0].answers).not.toHaveProperty("frequency");
  const voucherId = `qa-voucher-${Date.now()}`,
    voucher = {
      ...structuredClone(DEFAULT_SURVEYS[1]!),
      id: voucherId,
      title: "票券流程驗收",
    };
  const vs = await page.request.put("/api/admin/surveys", {
    headers,
    data: voucher,
  });
  const version = (await vs.json()).survey.version;
  const vpost = await page.request.post(`/api/surveys/${voucherId}`, {
    headers,
    data: {
      version,
      answers: {
        ease: 5,
        feature: "o1",
        improve: "o3",
        note: "測試功能完整、票券可查看。",
      },
    },
  });
  verify(vpost.ok(), await vpost.text()).toBeTruthy();
  const coupon = (await vpost.json()).reward.code;
  const latestResponse = await page.request.get("/api/account/membership");
  verify(latestResponse.ok(), await latestResponse.text()).toBeTruthy();
  const latest = await latestResponse.json();
  const found = latest.redemptions.find((r: any) => r.code === coupon);
  verify(found.minSpendNt).toBe(600);
  verify(found.status).toBe("AVAILABLE");
  await page.context().storageState({ path: "work/member-v2-auth.json" });
  fs.writeFileSync(
    "work/member-v2-fixture.json",
    JSON.stringify({ email, id, voucherId, coupon }, null, 2),
  );
  await page.goto("/account?tab=membership");
  await verify(
    page.getByRole("heading", { name: "我的會員權益", exact: true }),
  ).toBeVisible();
  await verify(page.locator(".member-tier-table thead th")).toHaveCount(6);
  await page.screenshot({
    path: "work/preview-membership.png",
    fullPage: true,
  });
  await page.goto("/rewards");
  await verify(
    page.getByRole("heading", { name: "點數商店", exact: true }),
  ).toBeVisible();
  await verify(
    page.getByRole("heading", { name: "點數遊樂場", exact: true }),
  ).toHaveCount(0);
  await page.goto("/account?tab=tickets");
  await verify(page.getByText(coupon, { exact: true })).toBeVisible();
  await page.screenshot({ path: "work/preview-tickets.png", fullPage: true });
  await page.goto("/account?tab=games");
  await verify(
    page.getByRole("button", { name: "開啟遊戲音效" }),
  ).toBeVisible();
  await page.screenshot({ path: "work/preview-games.png", fullPage: true });
  await page.getByRole("button", { name: "開啟遊戲音效" }).click();
  await verify(
    page.getByRole("button", { name: "關閉遊戲音效" }),
  ).toBeVisible();
  await page.goto("/account?tab=tasks");
  await verify(page.getByRole("heading", { name: "點數遊樂場" })).toHaveCount(
    0,
  );
  await page.goto("/surveys/pet-preferences");
  await verify(
    page.getByRole("heading", { name: "你和哪些毛孩一起生活？" }),
  ).toBeVisible();
  await page.screenshot({ path: "work/preview-survey.png", fullPage: true });
  await page.getByRole("button", { name: "貓咪", exact: true }).click();
  await page.getByRole("button", { name: "下一題", exact: true }).click();
  await verify(
    page.getByRole("heading", { name: "挑食物時，你最在意什麼？" }),
  ).toBeVisible();
  await page.goto("/admin/surveys");
  await verify(
    page.getByRole("heading", { name: "填答即時預覽" }),
  ).toBeVisible();
  await page.screenshot({
    path: "work/preview-survey-admin.png",
    fullPage: true,
  });
  for (const width of [1440, 1024, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await verify(page.getByRole("region", { name: "本期活動" })).toBeVisible();
    verify(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `work/preview-home-${width}.png`,
      fullPage: false,
    });
  }
  await page.request.put("/api/admin/surveys", {
    headers,
    data: { ...survey, status: "CLOSED" },
  });
  await page.request.put("/api/admin/surveys", {
    headers,
    data: { ...voucher, status: "CLOSED" },
  });
});
