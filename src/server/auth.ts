import "server-only";
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { ApiError } from "./http";
const scrypt = promisify(scryptCallback);
const COOKIE = "purespot-session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new ApiError(503, "會員驗證尚未設定");
  return new TextEncoder().encode(value);
}
export function assertSessionConfigured() {
  secret();
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, saved: string) {
  const [salt, hash] = saved.split(":");
  if (!salt || !hash || !/^[0-9a-f]{128}$/.test(hash)) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
export async function createSession(userId: string) {
  const key = secret();
  const tokenId = randomUUID();
  const id = createHash("sha256").update(tokenId).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(tokenId)
    .setIssuer("purespot")
    .setAudience("purespot-web")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
  await db.session.create({ data: { id, userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function requireUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) throw new ApiError(401, "請先登入會員");
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "purespot",
      audience: "purespot-web",
    }));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(401, "登入已過期，請重新登入");
  }
  if (!payload.sub || !payload.jti) throw new ApiError(401, "登入資料無效");
  const session = await db.session.findUnique({
    where: { id: createHash("sha256").update(payload.jti).digest("hex") },
    select: { userId: true, expiresAt: true },
  });
  if (
    !session ||
    session.userId !== payload.sub ||
    session.expiresAt <= new Date()
  )
    throw new ApiError(401, "登入已過期，請重新登入");
  return session.userId;
}
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret(), {
        algorithms: ["HS256"],
        issuer: "purespot",
        audience: "purespot-web",
      });
      if (payload.jti)
        await db.session.deleteMany({
          where: { id: createHash("sha256").update(payload.jti).digest("hex") },
        });
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
  }
  jar.delete(COOKIE);
}
