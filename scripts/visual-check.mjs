import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";

const origin = "http://127.0.0.1:3188";
const schemaName = process.env.VISUAL_SCHEMA;
let server;
if (schemaName) {
  const envLine = fs.readFileSync(".env", "utf8").split(/\r?\n/).find((line) => line.startsWith("DATABASE_URL="));
  if (!envLine) throw new Error("DATABASE_URL missing");
  const databaseUrl = new URL(envLine.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, ""));
  databaseUrl.searchParams.set("schema", schemaName);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3188"], { env: { ...process.env, DATABASE_URL: databaseUrl.toString(), APP_ORIGIN: origin }, stdio: "ignore", windowsHide: true });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${origin}/api/products`)).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("Visual check server did not start");
}
fs.mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: origin });
  const email = `visual-${randomUUID().slice(0, 8)}@example.test`;
  const registered = await context.request.post("/api/auth", { data: { action: "register", email, password: "StrongPass-1234", name: "小晴 Alice" }, headers: { Origin: origin } });
  if (!registered.ok()) throw new Error(`registration: ${registered.status()}`);
  const page = await context.newPage();
  await page.goto("/account?tab=membership", { waitUntil: "networkidle" });
  await page.getByText("新朋友", { exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/membership-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "家庭共買" }).click();
  await page.getByText(/FAM-[A-Z0-9]+/).waitFor();
  await page.screenshot({ path: "artifacts/family-desktop.png", fullPage: true });
  console.log("before mobile auth:", (await (await context.request.get("/api/auth")).json()).user?.email);
  console.log("cookie info:", (await context.cookies()).map((cookie) => ({ name: cookie.name, domain: cookie.domain, secure: cookie.secure })));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/account?tab=membership", { waitUntil: "domcontentloaded" });
  console.log("after mobile auth:", (await (await context.request.get("/api/auth")).json()).user?.email);
  await page.screenshot({ path: "artifacts/mobile-before-wait.png", fullPage: true });
  await page.getByRole("heading", { name: /小晴 Alice的日常/ }).waitFor();
  await page.getByText("新朋友", { exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/membership-mobile.png", fullPage: true });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  const item = { key: "pet-mochi:salmon-cat:ONCE:0", productId: "salmon-cat", petId: "pet-mochi", quantity: 1, mode: "ONCE", intervalDays: null };
  await page.evaluate((entry) => { localStorage.setItem("purespot-cart", JSON.stringify({ state: { items: [entry] }, version: 1 })); sessionStorage.setItem("purespot-promotions-seen-v1", "1"); }, item);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#navbar-cart-button").getByText("1", { exact: true }).waitFor();
  const promoClose = page.getByRole("button", { name: "關閉站內活動" });
  if (await promoClose.isVisible()) await promoClose.click();
  await page.locator("#navbar-cart-button").click();
  await page.screenshot({ path: "artifacts/cart-debug.png" });
  console.log("cart dialog:", (await page.getByRole("dialog").innerText()).slice(0, 800));
  await page.getByText("附隨箱活版印刷封蠟問候卡").waitFor();
  await page.getByText("附隨箱活版印刷封蠟問候卡").scrollIntoViewIfNeeded();
  await page.getByRole("dialog").screenshot({ path: "artifacts/gift-card-mobile.png" });
  await page.getByRole("button", { name: "放大看完整小卡與包裹" }).click();
  await page.getByRole("dialog").last().screenshot({ path: "artifacts/gift-preview-expanded-mobile.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "放進包裹" }).click();
  await page.getByRole("dialog").screenshot({ path: "artifacts/gift-parcel-mobile.png" });
  console.log("VISUAL SCREENSHOTS READY");
} finally {
  await browser.close();
  server?.kill();
}
