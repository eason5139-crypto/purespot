import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import type { ArcadeOutcome, ArcadeState } from "@/lib/arcade";

const db = new PrismaClient(), headers = { Origin: "http://127.0.0.1:3000" };
const check = expect.configure({ timeout: 25000 });
test.describe.configure({ mode: "serial" });
test.afterAll(async () => { await db.$disconnect(); });
async function fixture(request: APIRequestContext, points = 2000) {
  const email = `arcade-${crypto.randomUUID()}@example.test`;
  const r = await request.post("/api/auth", { headers, data: { action: "register", email, password: "PURESPOT-QA-2026!", name: "遊戲功能驗收" } });
  expect(r.status(), await r.text()).toBe(201);
  const { user } = await r.json();
  // Only this newly registered, non-personal fixture receives verification credits.
  expect(email).toMatch(/^arcade-.*@example\.test$/);
  await db.pointEntry.createMany({ data: [
    { userId: user.id, sourceKey: `welcome-craft:${user.id}`, title: "新會員入會禮遇（1點折NT$1）", points: 100 },
    { userId: user.id, sourceKey: `qa-arcade:${user.id}`, title: "遊戲功能驗收點數調整", points: points - 100 },
  ] });
  return user as { id: string };
}
async function state(request: APIRequestContext) { const r = await request.get("/api/account/arcade"); expect(r.ok(), await r.text()).toBeTruthy(); return await r.json() as ArcadeState; }
const playResponse = (page: Page) => page.waitForResponse(r => new URL(r.url()).pathname === "/api/account/arcade" && r.request().method() === "POST");

test("games respond before the request, match server outcomes and retain scratch progress on resize", async ({ page }) => {
  test.setTimeout(180000); await fixture(page.request);
  const errors: string[] = [], membershipReads: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (r.url().endsWith("/api/account/membership") && r.method() === "GET") membershipReads.push(r.url()); });
  await page.route("**/api/account/arcade", async route => { if (route.request().method() === "POST") await new Promise(resolve => setTimeout(resolve, 1000)); await route.continue(); });
  await page.goto("/account?tab=games");
  await check(page.locator(".game-wallet")).toHaveAttribute("aria-label", /可用點數 2000/);
  await check(page.getByRole("button", { name: "開啟遊戲音效" })).toBeVisible();
  await page.getByRole("button", { name: "開啟遊戲音效" }).click();
  const before = await state(page.request), wheelReply = playResponse(page), start = performance.now();
  await page.locator(".game-play-button").click();
  await expect(page.locator(".game-arena")).toHaveAttribute("data-phase", "running", { timeout: 500 });
  const responseMs = Math.round(performance.now() - start);
  const a = await page.locator(".wheel-disc").evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => page.locator(".wheel-disc").evaluate(el => getComputedStyle(el).transform), { timeout: 900 }).not.toBe(a);
  const reply = await wheelReply; expect(reply.ok(), await reply.text()).toBeTruthy(); const winner = (await reply.json()).result as ArcadeOutcome;
  await check(page.locator(".game-arena")).toHaveAttribute("data-phase", "result");
  const angle = await page.locator(".wheel-disc").evaluate(el => { const m = new DOMMatrix(getComputedStyle(el).transform); return ((Math.atan2(m.b, m.a) * 180 / Math.PI) + 360) % 360; });
  const step = 360 / before.config.wheels.CAT.prizes.length;
  expect(Math.floor(((360 - angle) % 360) / step)).toBe(winner.prizeIndex);
  expect(winner.newBalance).toBe(before.points - winner.costPoints + (winner.kind === "POINTS" ? winner.value : 0));
  await check(page.locator(".game-wallet")).toHaveAttribute("aria-label", `可用點數 ${winner.newBalance} 點`);
  await page.screenshot({ path: "work/arcade-upgrade/wheel-result.png", fullPage: false });

  await page.getByRole("tab", { name: /毛孩扭蛋機/ }).click();
  const ballReply = playResponse(page); await page.locator(".game-play-button").click();
  await expect(page.locator(".capsule-balls")).toHaveAttribute("aria-label", /正在/);
  const c = await page.locator(".capsule-balls").evaluate(el => (el as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(130); const d = await page.locator(".capsule-balls").evaluate(el => (el as HTMLCanvasElement).toDataURL());
  expect(d).not.toBe(c);
  await page.screenshot({ path: "work/arcade-upgrade/capsule-mixing.png", fullPage: false });
  const ball = await ballReply; expect(ball.ok(), await ball.text()).toBeTruthy();
  await check(page.locator(".capsule-stage")).toHaveAttribute("data-open", "true");
  await check(page.locator(".game-arena")).toHaveAttribute("data-phase", "result");
  await page.screenshot({ path: "work/arcade-upgrade/capsule-result.png", fullPage: false });

  await page.getByRole("tab", { name: /幸運刮刮卡/ }).click();
  const scratchReply = playResponse(page); await page.locator(".game-play-button").click();
  const scratch = await scratchReply; expect(scratch.ok(), await scratch.text()).toBeTruthy();
  await check(page.locator(".game-arena")).toHaveAttribute("data-phase", "scratching");
  let box = (await page.locator(".scratch-foil").boundingBox())!;
  await page.mouse.move(box.x + box.width * .1, box.y + box.height * .5); await page.mouse.down(); await page.mouse.move(box.x + box.width * .9, box.y + box.height * .5, { steps: 1 }); await page.mouse.up();
  await expect(page.locator(".game-arena")).toHaveAttribute("data-phase", "scratching");
  const progress = await page.getByRole("progressbar", { name: "刮卡進度" }).getAttribute("aria-valuenow"); expect(Number(progress)).toBeGreaterThan(10);
  await page.setViewportSize({ width: 390, height: 950 });
  await page.locator(".scratch-window").scrollIntoViewIfNeeded();
  await expect(page.getByRole("progressbar", { name: "刮卡進度" })).toHaveAttribute("aria-valuenow", progress!);
  for (const y of [.25, .75, .1, .9]) {
    if (await page.locator(".game-arena").getAttribute("data-phase") === "result") break;
    box = (await page.locator(".scratch-foil").boundingBox())!;
    await page.mouse.move(box.x + box.width * .07, box.y + box.height * y); await page.mouse.down(); await page.mouse.move(box.x + box.width * .93, box.y + box.height * y, { steps: 12 }); await page.mouse.up();
  }
  await check(page.locator(".game-arena")).toHaveAttribute("data-phase", "result");
  await expect(page.locator(".game-result-content")).toContainText("本回合獎勵已入帳");
  await page.screenshot({ path: "work/arcade-upgrade/scratch-result-mobile.png", fullPage: true });
  for (const width of [360, 390, 820, 1440]) { await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy(); }
  expect(membershipReads).toHaveLength(0); expect(errors).toEqual([]);
  fs.writeFileSync("work/arcade-upgrade/ui-verification.json", JSON.stringify({ firstResponseMs: responseMs, fullMemberReloads: membershipReads.length, pageErrors: errors, scratchResizeRetained: true }, null, 2));
});

test("a committed round survives a lost response and a page reload without another charge", async ({ page }) => {
  test.setTimeout(120000); const user = await fixture(page.request);
  await page.goto("/account?tab=games"); await check(page.locator(".game-wallet")).toHaveAttribute("aria-label", /2000/);
  let original: ArcadeOutcome | null = null, intercepted = false;
  await page.route("**/api/account/arcade", async route => {
    if (route.request().method() === "POST" && !intercepted) { intercepted = true; const response = await route.fetch(); original = (await response.json()).result; await route.abort("failed"); }
    else await route.continue();
  });
  await page.locator(".game-play-button").click(); await check(page.getByRole("button", { name: "確認這一回合" })).toBeVisible();
  const afterLost = await state(page.request); expect(afterLost.history).toHaveLength(1);
  await page.reload(); await check(page.getByRole("button", { name: "確認這一回合" })).toBeVisible();
  await page.getByRole("button", { name: "確認這一回合" }).click(); await check(page.locator(".game-arena")).toHaveAttribute("data-phase", "result");
  const afterRetry = await state(page.request); expect(afterRetry.points).toBe(afterLost.points); expect(afterRetry.history).toHaveLength(1); expect(afterRetry.history[0]).toEqual(original);
  expect(await db.pointEntry.count({ where: { userId: user.id, sourceKey: { startsWith: `wheel-cost:${user.id}:` } } })).toBe(1);
});

test("parallel retries, daily limits, insufficient points and altered request IDs keep ledger consistent", async ({ request }) => {
  test.setTimeout(150000); const user = await fixture(request), before = await state(request);
  const data = { requestId: crypto.randomUUID(), game: "wheel", wheelKey: "CAT", revision: before.revision };
  const twins = await Promise.all([request.post("/api/account/arcade", { headers, data }), request.post("/api/account/arcade", { headers, data })]);
  expect(twins.map(r => r.status())).toEqual([201, 201]);
  const results = await Promise.all(twins.map(r => r.json())); expect(results[0]).toEqual(results[1]);
  expect(await db.pointEntry.count({ where: { userId: user.id, sourceKey: { startsWith: `wheel-cost:${user.id}:` } } })).toBe(1);
  const changed = await request.post("/api/account/arcade", { headers, data: { ...data, game: "capsule" } }); expect(changed.status()).toBe(409);
  const stale = await request.post("/api/account/arcade", { headers, data: { ...data, requestId: crypto.randomUUID(), revision: "0000000000000000" } }); expect(stale.status()).toBe(409);
  const limit = before.config.scratch.dailyLimit;
  for (let i = 0; i < limit; i++) { const r = await request.post("/api/account/arcade", { headers, data: { game: "scratch", requestId: crypto.randomUUID(), revision: before.revision } }); expect(r.status(), await r.text()).toBe(201); }
  const atLimit = await state(request), denied = await request.post("/api/account/arcade", { headers, data: { game: "scratch", requestId: crypto.randomUUID() } }); expect(denied.status()).toBe(429);
  expect((await state(request)).points).toBe(atLimit.points);
  await fixture(request, 5); const low = await state(request);
  const poor = await request.post("/api/account/arcade", { headers, data: { game: "wheel", wheelKey: "CAT", requestId: crypto.randomUUID() } }); expect(poor.status()).toBe(409);
  expect((await state(request)).points).toBe(low.points);
});

test("reduced motion and keyboard scratch work without waiting for a spin", async ({ page }) => {
  test.setTimeout(100000); await fixture(page.request); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/account?tab=games"); await check(page.locator(".game-wallet")).toHaveAttribute("aria-label", /2000/);
  const wheel = playResponse(page); await page.locator(".game-play-button").click(); await wheel;
  await expect(page.locator(".game-arena")).toHaveAttribute("data-phase", "result", { timeout: 1500 });
  await page.getByRole("tab", { name: /幸運刮刮卡/ }).click(); const scratch = playResponse(page); await page.locator(".game-play-button").click(); await scratch;
  await check(page.locator(".scratch-foil")).toBeEnabled(); await page.locator(".scratch-foil").press("Enter");
  await check(page.locator(".game-arena")).toHaveAttribute("data-phase", "result");
});

test("a new member can enter the game with the welcome benefit issued exactly once", async ({ request }) => {
  const r = await request.post("/api/auth", { headers, data: { action: "register", email: `arcade-entry-${crypto.randomUUID()}@example.test`, password: "PURESPOT-QA-2026!", name: "遊戲入會流程驗收" } });
  expect(r.status()).toBe(201); const { user } = await r.json();
  const reads = await Promise.all([state(request), state(request)]);
  expect(reads.map(r => r.points)).toEqual([100, 100]);
  expect(await db.pointEntry.count({ where: { userId: user.id, sourceKey: `welcome-craft:${user.id}` } })).toBe(1);
});
