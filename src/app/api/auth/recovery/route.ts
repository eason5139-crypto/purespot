import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { createAccountToken, findValidToken } from "@/server/accountTokens";
import { hashPassword } from "@/server/auth";

export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), email: z.email().max(254) }).strict(),
  z.object({ action: z.literal("reset"), email: z.email().max(254), code: z.string().regex(/^\d{8}$/), newPassword: z.string().min(12).max(128) }).strict(),
]);
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const input = await readBody(request, schema);
    const email = input.email.toLowerCase();
    await rateLimit(`recovery:${email}`, 5, 3600);
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (input.action === "request") {
      if (user) {
        const recent = await db.accountToken.count({ where: { userId: user.id, kind: "RESET", createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
        if (!recent) await createAccountToken(user.id, "RESET");
      }
      return NextResponse.json({ message: "若帳戶存在，重設申請已送出。請向網站管理員索取一次性確認碼。" });
    }
    if (!user) throw new ApiError(400, "確認碼無效或已過期");
    const token = await findValidToken(user.id, "RESET", input.code);
    if (!token) throw new ApiError(400, "確認碼無效或已過期");
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } }),
      db.accountToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ message: "密碼已更新，請重新登入" });
  } catch (error) { return apiError(error); }
}
