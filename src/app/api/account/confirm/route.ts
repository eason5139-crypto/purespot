import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { createAccountToken, findValidToken } from "@/server/accountTokens";

export const runtime = "nodejs";
export async function GET() {
  try {
    const userId = await requireUser();
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { demoConfirmedAt: true, emailVerifiedAt: true } });
    return NextResponse.json(user, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("begin") }).strict(),
  z.object({ action: z.literal("confirm"), code: z.string().regex(/^\d{8}$/) }).strict(),
  z.object({ action: z.literal("password"), currentPassword: z.string().min(1), newPassword: z.string().min(12).max(128) }).strict(),
]);
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`account-confirm:${userId}`, 12, 900);
    const input = await readBody(request, schema);
    if (input.action === "begin") {
      const { code } = await createAccountToken(userId, "CONFIRM");
      return NextResponse.json({ code, expiresInMinutes: 15 });
    }
    if (input.action === "confirm") {
      const token = await findValidToken(userId, "CONFIRM", input.code);
      if (!token) throw new ApiError(400, "確認碼無效或已過期");
      await db.$transaction([
        db.accountToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
        db.user.update({ where: { id: userId }, data: { demoConfirmedAt: new Date() } }),
      ]);
      return NextResponse.json({ confirmed: true });
    }
    const { verifyPassword, hashPassword } = await import("@/server/auth");
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!await verifyPassword(input.currentPassword, user.passwordHash)) throw new ApiError(400, "目前密碼不正確");
    await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
