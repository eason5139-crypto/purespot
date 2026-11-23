import { expect, type APIRequestContext } from "@playwright/test";
export async function createMemberFixture(request: APIRequestContext) {
  const headers = { Origin: "http://127.0.0.1:3000" };
  const register = await request.post("/api/auth", {
    headers,
    data: {
      action: "register",
      email: `member-flow-${crypto.randomUUID()}@example.test`,
      password: "PURESPOT-QA-2026!",
      name: "功能驗收",
    },
  });
  expect(register.status(), await register.text()).toBe(201);
  const membership = await request.get("/api/account/membership");
  expect(membership.ok(), await membership.text()).toBeTruthy();
  const login = await request.post("/api/admin/session", {
    headers,
    data: {
      username: "Yichen",
      password: process.env.PURESPOT_ADMIN_TEST_PASSWORD,
    },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const pref = await (await request.get("/api/surveys/pet-preferences")).json();
  const points = await request.post("/api/surveys/pet-preferences", {
    headers,
    data: {
      version: pref.survey.version,
      answers: {
        species: ["o1"],
        priority: "o1",
        shopping: "o2",
        autoship: "o2",
      },
    },
  });
  expect(points.ok(), await points.text()).toBeTruthy();
  const feedback = await (
    await request.get("/api/surveys/site-feedback")
  ).json();
  const voucher = await request.post("/api/surveys/site-feedback", {
    headers,
    data: {
      version: feedback.survey.version,
      answers: { ease: 5, feature: "o1", improve: "o3", note: "流程驗收紀錄" },
    },
  });
  expect(voucher.ok(), await voucher.text()).toBeTruthy();
  return { coupon: (await voucher.json()).reward.code };
}
