import {
  test,
  expect,
  request as requests,
  type APIRequestContext,
} from "@playwright/test";
const origin = "http://127.0.0.1:3000",
  headers = { Origin: origin },
  check = expect.configure({ timeout: 25000 });
async function admin() {
  const c = await requests.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  const r = await c.post("/api/admin/session", {
    data: {
      username: "Yichen",
      password: process.env.PURESPOT_ADMIN_TEST_PASSWORD,
    },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  return c;
}
async function register(c: APIRequestContext) {
  const r = await c.post("/api/auth", {
    headers,
    data: {
      action: "register",
      email: `support-${crypto.randomUUID()}@example.test`,
      password: "PURESPOT-QA-2026!",
      name: "客服功能驗收",
    },
  });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()).user;
}
async function create(
  c: APIRequestContext,
  extra: Record<string, unknown> = {},
) {
  const r = await c.post("/api/support/chat", {
    headers,
    data: {
      action: "create",
      requestId: crypto.randomUUID(),
      category: "TECHNICAL",
      subject: "網站操作測試",
      message: "請協助確認這個操作步驟。",
      ...extra,
    },
  });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()).thread;
}
test("buyer completion resets to new inquiry; history, rating and related follow-up stay linked", async ({
  page,
}) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD);
  test.setTimeout(160000);
  const staff = await admin();
  await register(page.request);
  await page.goto("/account?tab=support");
  await check(
    page.getByRole("button", { name: "新諮詢", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新諮詢", exact: true }).click();
  await page.getByRole("button", { name: /活動與遊戲/ }).click();
  await page.getByLabel("問題主旨", { exact: true }).fill("遊戲獎勵詢問");
  await page
    .getByLabel("問題內容", { exact: true })
    .fill("想確認這一回合點數的入帳紀錄。");
  const posted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/support/chat") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "送出諮詢", exact: true }).click();
  const thread = (await (await posted).json()).thread;
  await check(page.locator(".support-conversation h3")).toHaveText(
    "遊戲獎勵詢問",
  );
  const close = await staff.patch("/api/admin/support", {
    data: {
      id: thread.id,
      status: "RESOLVED",
      response: "已核對本回合紀錄，獎勵已入帳，可在最近好運查看。",
      note: "這段僅供公司端查看。",
      tags: ["操作問題"],
      expectedVersion: thread.version,
      requestId: crypto.randomUUID(),
    },
  });
  expect(close.ok(), await close.text()).toBeTruthy();
  await check(page.locator(".support-completed")).toContainText("已完成");
  await check(
    page.getByRole("heading", { name: "先選一個問題分類" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /查看最後回覆/ }).click();
  await check(page.locator(".support-messages")).toContainText(
    "已核對本回合紀錄",
  );
  expect(await page.locator(".support-panel").innerText()).not.toContain(
    "這段僅供公司端查看",
  );
  await page.getByRole("button", { name: "5 分", exact: true }).click();
  await page.getByLabel("想告訴我們的話（選填）").fill("回覆很清楚，謝謝。");
  await page.getByRole("button", { name: "送出評價", exact: true }).click();
  await check(page.locator(".support-rating-saved")).toContainText("5／5");
  await page.getByRole("button", { name: "另開相關諮詢", exact: true }).click();
  await page
    .getByLabel("問題內容", { exact: true })
    .fill("另外想詢問如何查看兌換券。");
  const follow = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/support/chat") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "送出諮詢", exact: true }).click();
  expect((await (await follow).json()).thread.parentId).toBe(thread.id);
  const snapshot = await (await page.request.get("/api/support/chat")).json(),
    old = snapshot.threads.find((t: any) => t.id === thread.id);
  expect(old.status).toBe("RESOLVED");
  expect(old.messages).toHaveLength(2);
  expect(old.feedback.score).toBe(5);
  expect(old).not.toHaveProperty("internalNotes");
  expect(old).not.toHaveProperty("clientToken");
  await page.screenshot({
    path: "work/support-v2/buyer-history.png",
    fullPage: true,
  });
  for (const width of [390, 820]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await staff.dispose();
});
test("guest records are private, can be claimed, and cannot be accessed after logout", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const a = await browser.newContext({ baseURL: origin }),
    b = await browser.newContext({ baseURL: origin });
  await a.request.get(origin + "/api/support/chat");
  const guest = await create(a.request);
  const none = await (
    await b.request.get(origin + "/api/support/chat?clientToken=" + guest.id)
  ).json();
  expect(none.threads).toHaveLength(0);
  const attack = await b.request.post(origin + "/api/support/chat", {
    headers,
    data: {
      action: "reply",
      threadId: guest.id,
      message: "不屬於此訪客的訊息",
      requestId: crypto.randomUUID(),
    },
  });
  expect(attack.status()).toBe(404);
  await register(a.request);
  const claim = await a.request.post(origin + "/api/support/chat", {
    headers,
    data: { action: "claim", requestId: crypto.randomUUID() },
  });
  expect((await claim.json()).claimed).toBe(1);
  expect(
    (
      await (await a.request.get(origin + "/api/support/chat")).json()
    ).threads.some((t: any) => t.id === guest.id),
  ).toBeTruthy();
  await a.request.delete(origin + "/api/auth", { headers });
  expect(
    (await (await a.request.get(origin + "/api/support/chat")).json()).threads,
  ).toHaveLength(0);
  await a.close();
  await b.close();
});
test("admin filters, chart drill-down, internal notes, batch close and category settings work", async ({
  page,
}) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD);
  test.setTimeout(180000);
  await page.request.post("/api/admin/session", {
    headers,
    data: {
      username: "Yichen",
      password: process.env.PURESPOT_ADMIN_TEST_PASSWORD,
    },
  });
  const marker = `批次驗收${Date.now()}`;
  await create(page.request, {
    subject: marker + "甲",
    category: "MEMBERSHIP",
  });
  await create(page.request, { subject: marker + "乙", category: "GAMES" });
  await page.goto("/admin/support");
  await check(
    page.getByRole("heading", { name: "把每個問題，好好接住。" }),
  ).toBeVisible();
  await page.getByLabel("搜尋客服案件").fill(marker);
  await check(page.locator(".support-case")).toHaveCount(2);
  await page.getByLabel("選取目前列表", { exact: true }).check();
  await page.getByRole("button", { name: "批次處理", exact: true }).click();
  await check(page.getByRole("dialog")).toContainText(marker + "甲");
  await check(page.getByRole("dialog")).toContainText(marker + "乙");
  await page.getByLabel("批次改分類").selectOption("OTHER");
  await page.getByLabel("將選中的案件標記為已完成").check();
  await page.getByRole("button", { name: "確認套用", exact: true }).click();
  await check(page.locator(".support-case")).toHaveCount(0);
  await page.getByRole("button", { name: "歷史紀錄", exact: true }).click();
  await check(page.locator(".support-case")).toHaveCount(2);
  await page.screenshot({
    path: "work/support-v2/admin-history.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "統計圖表", exact: true }).click();
  await check(
    page.getByRole("heading", { name: "大家最常問什麼？" }),
  ).toBeVisible();
  await page.screenshot({
    path: "work/support-v2/admin-charts.png",
    fullPage: true,
  });
  await page
    .locator(".support-chart-legend button")
    .filter({ hasText: "會員與點數" })
    .click();
  await check(page.getByLabel("客服問題分類")).toHaveValue("MEMBERSHIP");
  await page
    .getByRole("button", { name: "分類與回覆設定", exact: true })
    .click();
  await check(page.locator(".support-settings details")).toHaveCount(9);
  await page
    .locator(".support-settings details")
    .nth(5)
    .locator("summary")
    .click();
  await check(
    page
      .locator(".support-settings details")
      .nth(5)
      .getByLabel("分類名稱", { exact: true }),
  ).toHaveValue("會員與點數");
  for (const width of [390, 820]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
test("closed threads reject replies and repeated ratings, while stale admin updates keep new messages", async ({
  page,
}) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD);
  test.setTimeout(120000);
  const staff = await admin();
  await register(page.request);
  const t = await create(page.request);
  const body = {
    action: "reply",
    threadId: t.id,
    message: "補上最新的操作資訊。",
    requestId: crypto.randomUUID(),
  };
  const twins = await Promise.all([
    page.request.post("/api/support/chat", { headers, data: body }),
    page.request.post("/api/support/chat", { headers, data: body }),
  ]);
  expect(twins.map((r) => r.status())).toEqual([200, 200]);
  const stale = await staff.patch("/api/admin/support", {
    data: {
      id: t.id,
      status: "RESOLVED",
      response: "準備結案",
      expectedVersion: t.version,
      requestId: crypto.randomUUID(),
    },
  });
  expect(stale.status()).toBe(409);
  const before = (
    await (await page.request.get("/api/support/chat")).json()
  ).threads.find((r: any) => r.id === t.id);
  expect(before.messages).toHaveLength(2);
  expect(before.status).toBe("OPEN");
  const done = await staff.patch("/api/admin/support", {
    data: {
      id: t.id,
      status: "RESOLVED",
      response: "已查看最新資料並完成處理。",
      expectedVersion: before.version,
      requestId: crypto.randomUUID(),
    },
  });
  expect(done.ok(), await done.text()).toBeTruthy();
  expect(
    (
      await page.request.post("/api/support/chat", {
        headers,
        data: { ...body, requestId: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
  const rate = {
    action: "rate",
    id: t.id,
    score: 4,
    comment: "",
    requestId: crypto.randomUUID(),
  };
  expect(
    (
      await page.request.post("/api/support/chat", { headers, data: rate })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/support/chat", {
        headers,
        data: { ...rate, requestId: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
  const config = (await (await staff.get("/api/admin/support")).json())
    .settings;
  const saved = await staff.patch("/api/admin/support", {
    data: { action: "settings", settings: config },
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
  const publicData = await (await page.request.get("/api/support/chat")).json();
  expect(publicData.settings.categories.map((c: any) => c.label)).toEqual(
    config.categories.map((c: any) => c.label),
  );
  expect(
    publicData.settings.categories.every((c: any) => c.templates.length === 0),
  ).toBeTruthy();
  await staff.dispose();
});
test("floating support is keyboard accessible and works on a phone", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "開啟職人線上客服中心" }).click();
  await check(page.getByRole("dialog")).toBeVisible();
  await check(page.locator(".support-category-grid>button")).toHaveCount(9);
  await page
    .locator(".support-dialog")
    .screenshot({ path: "work/support-v2/widget-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await check(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("order support binds only the buyer's order and shows its real summary to staff", async ({
  page,
  browser,
}) => {
  test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD);
  test.setTimeout(150000);
  const staff = await admin();
  await register(page.request);
  const checkout = await page.request.post("/api/orders/checkout", {
    headers,
    data: {
      idempotencyKey: crypto.randomUUID(),
      paymentMethod: "transfer",
      pointsToUse: 0,
      items: [
        {
          productId: "salmon-cat",
          quantity: 1,
          intervalDays: null,
          pet: {
            id: "support-order-cat",
            name: "客服驗收貓",
            type: "CAT",
            breed: "家貓",
            weightKg: 4,
            ageMonths: 24,
            isNeutered: true,
            activityLevel: "MODERATE",
            allergies: [],
            goal: "MAINTAIN",
          },
        },
      ],
      shippingAddress: {
        name: "客服訂單驗收",
        phone: "0900000000",
        postalCode: "100",
        address: "客服功能驗收用地址",
      },
    },
  });
  expect(checkout.ok(), await checkout.text()).toBeTruthy();
  const order = (await checkout.json()).order;
  const t = await create(page.request, {
    category: "ORDER",
    subject: "訂單摘要核對",
    orderId: order.id,
  });
  const other = await browser.newContext({ baseURL: origin });
  await register(other.request);
  const denied = await other.request.post("/api/support/chat", {
    headers,
    data: {
      action: "create",
      requestId: crypto.randomUUID(),
      category: "ORDER",
      subject: "跨帳號訂單",
      message: "測試不可取得他人訂單",
      orderId: order.id,
    },
  });
  expect(denied.status()).toBe(404);
  const summary = await staff.get(`/api/admin/support?orderId=${order.id}`);
  expect(summary.ok()).toBeTruthy();
  const real = (await summary.json()).order;
  expect(real.id).toBe(order.id);
  expect(real.items).toHaveLength(1);
  expect(real.items[0].quantity).toBe(1);
  await page.request.post("/api/admin/session", {
    headers,
    data: {
      username: "Yichen",
      password: process.env.PURESPOT_ADMIN_TEST_PASSWORD,
    },
  });
  await page.goto("/admin/support");
  await page.getByLabel("搜尋客服案件").fill(t.id);
  await check(page.locator(".support-case")).toHaveCount(1);
  await page.locator(".support-case>button").click();
  await check(page.locator(".support-order")).toContainText(
    real.items[0].productName,
  );
  await page.screenshot({
    path: "work/support-v2/admin-order.png",
    fullPage: false,
  });
  await other.close();
  await staff.dispose();
});
