import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { supportFields } from "@/lib/accountSchemas";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, supportFields);
    const order = await db.order.findFirst({ where: { id: input.orderId, userId }, select: { status: true } });
    if (!order) throw new ApiError(404, "找不到訂單");
    if (order.status === "CANCELLED") throw new ApiError(400, "已取消訂單無法提出售後需求");
    const openCount = await db.supportRequest.count({ where: { userId, orderId: input.orderId, status: { in: ["OPEN", "IN_PROGRESS"] } } });
    if (openCount >= 3) throw new ApiError(400, "這筆訂單已有三筆處理中的需求，請先等候回覆");
    const supportRequest = await db.supportRequest.create({ data: { userId, orderId: input.orderId, kind: input.kind, message: input.message } });
    return NextResponse.json({ supportRequest }, { status: 201 });
  } catch (error) { return apiError(error); }
}
