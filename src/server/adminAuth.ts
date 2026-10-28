import "server-only";

import {
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { ApiError } from "./http";

const scrypt = promisify(scryptCallback);
const ADMIN_COOKIE = "purespot-admin-session";
const SESSION_AGE_SECONDS = 8 * 60 * 60;

function adminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

function adminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH?.trim() ?? "";
}

function signingKey() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new ApiError(503, "後台登入尚未完成安全設定");
  }
  return new TextEncoder().encode(value);
}

function assertAdminConfigured() {
  if (!adminEmail() || !adminPasswordHash()) {
    throw new ApiError(503, "後台管理員帳號尚未設定");
  }
  signingKey();
}

async function verifyAdminPassword(password: string) {
  const [salt, hash] = adminPasswordHash().split(":");
  if (!salt || !hash || !/^[0-9a-f]{128}$/i.test(hash)) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function authenticateAdmin(email: string, password: string) {
  assertAdminConfigured();
  const expectedEmail = adminEmail();
  const suppliedEmail = email.trim().toLowerCase();
  const suppliedBuffer = Buffer.from(suppliedEmail);
  const expectedBuffer = Buffer.from(expectedEmail);
  const emailMatches =
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer);

  if (!emailMatches || !(await verifyAdminPassword(password))) {
    throw new ApiError(401, "帳號或密碼不正確");
  }

  return { email: expectedEmail };
}

export async function createAdminSession(email: string) {
  const token = await new SignJWT({ role: "admin", email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer("purespot-admin")
    .setAudience("purespot-backoffice")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_AGE_SECONDS}s`)
    .sign(signingKey());

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_AGE_SECONDS,
  });
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer: "purespot-admin",
      audience: "purespot-backoffice",
    });
    if (payload.role !== "admin" || payload.sub !== adminEmail()) return null;
    return { email: payload.sub };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) throw new ApiError(401, "請先登入後台管理系統");
  return session;
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
