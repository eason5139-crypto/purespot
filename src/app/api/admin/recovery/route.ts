import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError } from "@/server/http";
import { codeForToken } from "@/server/accountTokens";

export const runtime = "nodejs";
export async function GET() {
  try {
    await requireAdminSession();
    const tokens = await db.accountToken.findMany({ where: { kind: "RESET", usedAt: null, expiresAt: { gt: new Date() } }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 30 });
    return NextResponse.json({ requests: tokens.map((token) => ({ id: token.id, name: token.user.name, email: token.user.email, code: codeForToken(token.id), expiresAt: token.expiresAt })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
