import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "./db";

function tokenSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET 尚未設定");
  return secret;
}

export function codeForToken(id: string) {
  const hex = createHmac("sha256", tokenSecret()).update(`account-code:${id}`).digest("hex");
  return String(BigInt(`0x${hex.slice(0, 13)}`) % 100_000_000n).padStart(8, "0");
}

function codeHash(id: string, code: string) {
  return createHmac("sha256", tokenSecret()).update(`${id}:${code}`).digest("hex");
}

export async function createAccountToken(userId: string, kind: "CONFIRM" | "RESET") {
  const id = randomUUID();
  const code = codeForToken(id);
  const token = await db.accountToken.create({ data: { id, userId, kind, codeHash: codeHash(id, code), expiresAt: new Date(Date.now() + (kind === "RESET" ? 30 : 15) * 60_000) } });
  return { token, code };
}

export async function findValidToken(userId: string, kind: "CONFIRM" | "RESET", code: string) {
  const tokens = await db.accountToken.findMany({ where: { userId, kind, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 5 });
  return tokens.find((token) => {
    const expected = Buffer.from(token.codeHash, "hex");
    const supplied = Buffer.from(codeHash(token.id, code), "hex");
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  });
}
