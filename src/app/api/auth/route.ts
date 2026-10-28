import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import {
  assertSessionConfigured,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  requireUser,
} from "@/server/auth";
import { rateLimit } from "@/server/rateLimit";
export const runtime = "nodejs";
const inputSchema = z
  .object({
    action: z.enum(["register", "login"]),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(12).max(128),
    name: z.string().trim().min(1).max(50).optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    assertSessionConfigured();
    await rateLimit("auth:global", 1000, 900);
    const input = await readBody(request, inputSchema);
    await rateLimit(`auth:${input.email}`);
    let user = await db.user.findUnique({ where: { email: input.email } });
    if (input.action === "register") {
      if (user) throw new ApiError(409, "此信箱無法註冊，請改用登入");
      user = await db.user.create({
        data: {
          email: input.email,
          passwordHash: await hashPassword(input.password),
          name: input.name,
        },
      });
    } else if (
      !user ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      throw new ApiError(401, "信箱或密碼不正確");
    }
    await createSession(user.id);
    return NextResponse.json(
      {
        message: "登入成功",
        user: { id: user.id, name: user.name, email: user.email },
      },
      { status: input.action === "register" ? 201 : 200 },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function GET() {
  try {
    const id = await requireUser();
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json(
      { user },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return NextResponse.json({ user: null }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    await destroySession();
    return NextResponse.json({ message: "已登出" });
  } catch (e) {
    return apiError(e);
  }
}
