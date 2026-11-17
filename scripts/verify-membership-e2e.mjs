import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const envLine = fs.readFileSync(".env", "utf8").split(/\r?\n/).find((line) => line.startsWith("DATABASE_URL="));
if (!envLine) throw new Error("DATABASE_URL missing");
const baseUrl = new URL(envLine.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, ""));
const schemaName = process.env.TEST_SCHEMA || `codex_membership_verify_${Date.now()}`;
baseUrl.searchParams.set("schema", schemaName);
const databaseUrl = baseUrl.toString();
const migrationUrl = new URL(databaseUrl);
migrationUrl.hostname = migrationUrl.hostname.replace("-pooler.", ".");
const origin = "http://localhost:3188";
const env = { ...process.env, DATABASE_URL: databaseUrl, APP_ORIGIN: origin, NEXT_PUBLIC_DEMO_MODE: "false" };
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
let server;
let serverLog = "";

function command(commandLine, extraEnv = {}) {
  const result = spawnSync("cmd.exe", ["/d", "/s", "/c", commandLine], { env: { ...env, ...extraEnv }, stdio: "pipe", encoding: "utf8", timeout: 180000 });
  if (result.status !== 0) throw new Error(`${commandLine} failed: ${result.stdout.slice(-1000)} ${result.stderr.slice(-1000)}`);
  console.log(`${commandLine}: OK`);
}
async function waitReady() {
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(`${origin}/api/products`); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("dev server not ready");
}
async function request(path, method = "GET", body, cookie = "") {
  const response = await fetch(`${origin}${path}`, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), Origin: origin }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return { data, cookie: response.headers.get("set-cookie")?.split(";")[0] || cookie };
}
async function expectStatus(path, method, body, cookie, status) {
  const response = await fetch(`${origin}${path}`, { method, headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify(body) });
  if (response.status !== status) throw new Error(`${method} ${path}: expected ${status}, got ${response.status}`);
}
const petInput = (name) => ({ name, type: "CAT", breed: "米克斯", weightKg: 4, ageMonths: 24, isNeutered: true, activityLevel: "MODERATE", allergies: [], goal: "MAINTAIN" });
function activePet(id, name) { return { id, cloudId: id, ...petInput(name) }; }

try {
  console.log(`isolated schema: ${schemaName}`);
  if (!process.env.TEST_SCHEMA) { command("npx prisma migrate deploy", { DATABASE_URL: migrationUrl.toString(), PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" }); command("npx tsx prisma/seed.ts"); }
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3188"], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.stdout.on("data", (part) => { serverLog = (serverLog + part.toString()).slice(-12000); });
  server.stderr.on("data", (part) => { serverLog = (serverLog + part.toString()).slice(-12000); });
  await waitReady();
  const suffix = randomUUID().slice(0, 8);
  const aliceEmail = `member-alice-${suffix}@example.test`;
  const bobEmail = `member-bob-${suffix}@example.test`;
  const alice = await request("/api/auth", "POST", { action: "register", email: aliceEmail, password: "StrongPass-1234", name: "小晴 Alice" });
  const bob = await request("/api/auth", "POST", { action: "register", email: bobEmail, password: "StrongPass-5678", name: "阿哲 Bob" });
  console.log("registration: OK");
  const confirmation = await request("/api/account/confirm", "POST", { action: "begin" }, alice.cookie);
  await request("/api/account/confirm", "POST", { action: "confirm", code: confirmation.data.code }, alice.cookie);
  console.log("account confirmation: OK");
  const alicePet = (await request("/api/pets", "POST", petInput("奶茶"), alice.cookie)).data.pet;
  const bobPet = (await request("/api/pets", "POST", petInput("雪球"), bob.cookie)).data.pet;
  const care = (await request("/api/account/care", "POST", { action: "record", petId: alicePet.id, kind: "NOTE", note: "今天一起散步" }, alice.cookie)).data.record;
  await request("/api/account/growth", "POST", { careRecordId: care.id, title: "一起散步的日子", note: "天氣很好" }, alice.cookie);
  const album = (await request("/api/account/growth", "GET", undefined, alice.cookie)).data;
  if (album.moments.length !== 1) throw new Error("growth moment missing");
  console.log("pet and growth album: OK");
  const family = (await request("/api/account/family", "GET", undefined, alice.cookie)).data;
  await request("/api/account/family", "POST", { action: "join", code: family.group.inviteCode }, bob.cookie);
  await request("/api/account/family", "POST", { action: "add", productId: "salmon-cat", petId: bobPet.id, quantity: 6, note: "給雪球" }, bob.cookie);
  const familyForOwner = (await request("/api/account/family", "GET", undefined, alice.cookie)).data;
  if (familyForOwner.items.length !== 1 || familyForOwner.pets.length !== 2) throw new Error("family data not shared");
  await expectStatus("/api/orders/checkout", "POST", { idempotencyKey: randomUUID(), paymentMethod: "credit", familyGroupId: family.group.id, items: [{ productId: "salmon-cat", pet: activePet(bobPet.id, "雪球"), quantity: 6, intervalDays: null }], shippingAddress: { name: "阿哲", phone: "0912345678", postalCode: "100", address: "臺北市中正區測試路 1 號" } }, bob.cookie, 403);
  console.log("cross-account family list: OK");
  const address = { name: "小晴", phone: "0912345678", postalCode: "100", address: "臺北市中正區測試路 1 號" };
  const firstOrder = (await request("/api/orders/checkout", "POST", { idempotencyKey: randomUUID(), paymentMethod: "credit", familyGroupId: family.group.id, items: [{ productId: "salmon-cat", pet: activePet(bobPet.id, "雪球"), quantity: 6, intervalDays: null }], shippingAddress: address, giftCard: { included: true, recipient: "雪球", message: "每天都開心", signature: "小晴", font: "serif", tone: "blue" } }, alice.cookie)).data.order;
  const storedOrder = await db.order.findUniqueOrThrow({ where: { id: firstOrder.id }, include: { items: true } });
  if (storedOrder.status !== "PAID" || storedOrder.familyGroupId !== family.group.id || storedOrder.items[0].petId !== bobPet.id || storedOrder.giftCard?.recipient !== "雪球") throw new Error("family checkout data mismatch");
  const afterFamily = (await request("/api/account/family", "GET", undefined, alice.cookie)).data;
  if (afterFamily.items.length) throw new Error("family list not cleared after order");
  console.log("owner family checkout and gift card: OK");
  const membership = (await request("/api/account/membership", "GET", undefined, alice.cookie)).data;
  if (membership.points < 50) throw new Error(`points too low: ${membership.points}`);
  const redemption = (await request("/api/account/membership", "POST", { action: "redeem", rewardId: "starter-50" }, alice.cookie)).data.redemption;
  const secondOrder = (await request("/api/orders/checkout", "POST", { idempotencyKey: randomUUID(), paymentMethod: "linepay", discountCode: redemption.code, items: [{ productId: "salmon-cat", pet: activePet(alicePet.id, "奶茶"), quantity: 1, intervalDays: null }], shippingAddress: address }, alice.cookie)).data.order;
  const discountOrder = await db.order.findUniqueOrThrow({ where: { id: secondOrder.id } });
  if (discountOrder.discountNt !== 50 || discountOrder.totalNt !== 1010) throw new Error("discount not applied");
  await expectStatus("/api/orders/checkout", "POST", { idempotencyKey: randomUUID(), paymentMethod: "linepay", discountCode: redemption.code, items: [{ productId: "salmon-cat", pet: activePet(alicePet.id, "奶茶"), quantity: 1, intervalDays: null }], shippingAddress: address }, alice.cookie, 400);
  const memory = (await request("/api/account/memories", "GET", undefined, alice.cookie)).data;
  if (memory.orders.length !== 2) throw new Error("purchase memories missing");
  console.log("points, reward, discount, memories: OK");
  await request("/api/auth/recovery", "POST", { action: "request", email: bobEmail });
  const bobUser = await db.user.findUniqueOrThrow({ where: { email: bobEmail } });
  const token = await db.accountToken.findFirstOrThrow({ where: { userId: bobUser.id, kind: "RESET" }, orderBy: { createdAt: "desc" } });
  const secret = env.SESSION_SECRET || fs.readFileSync(".env", "utf8").split(/\r?\n/).find((line) => line.startsWith("SESSION_SECRET="))?.slice(15).replace(/^"|"$/g, "");
  if (!secret) throw new Error("session secret missing");
  const hex = createHmac("sha256", secret).update(`account-code:${token.id}`).digest("hex");
  const code = String(BigInt(`0x${hex.slice(0, 13)}`) % 100_000_000n).padStart(8, "0");
  await request("/api/auth/recovery", "POST", { action: "reset", email: bobEmail, code, newPassword: "UpdatedPass-5678" });
  await request("/api/auth", "POST", { action: "login", email: bobEmail, password: "UpdatedPass-5678" });
  console.log("manual recovery and new login: OK");
  console.log("ALL MEMBERSHIP E2E CHECKS PASSED");
} catch (error) {
  console.error("Server log tail:", serverLog.slice(-5000));
  throw error;
} finally {
  if (server) server.kill();
  await db.$disconnect();
}
