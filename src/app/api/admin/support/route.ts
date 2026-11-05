import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdminSession } from "@/server/adminAuth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    await requireAdminSession();
    const requests = await db.supportRequest.findMany({
      include: { user: { select: { name: true, email: true } }, order: { select: { status: true, totalNt: true } } },
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const input = await readBody(request, z.object({ id: z.string().min(1).max(100), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]), response: z.string().trim().max(1000).nullable() }).strict());
    const exists = await db.supportRequest.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!exists) throw new ApiError(404, "找不到售後需求");
    const updated = await db.supportRequest.update({ where: { id: input.id }, data: { status: input.status, response: input.response } });
    return NextResponse.json({ request: updated });
  } catch (error) { return apiError(error); }
}
