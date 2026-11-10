import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdminSession } from "@/server/adminAuth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const { orderIds } = await readBody(request, z.object({ orderIds: z.array(z.uuid()).min(1).max(50) }).strict());
    if (new Set(orderIds).size !== orderIds.length) throw new ApiError(400, "請勿重複選擇訂單");
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, status: true } });
      if (existing.length !== orderIds.length) throw new ApiError(404, "有訂單不存在，請更新列表");
      if (existing.some((order) => !["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"].includes(order.status))) throw new ApiError(400, "選取的訂單含有待付款或已取消訂單");
      await tx.order.updateMany({ where: { id: { in: orderIds }, status: "PAID" }, data: { status: "PROCESSING" } });
      await tx.order.updateMany({ where: { id: { in: orderIds }, status: "PROCESSING" }, data: { status: "DISPATCHED" } });
      await tx.order.updateMany({ where: { id: { in: orderIds }, status: "DISPATCHED" }, data: { status: "COMPLETED" } });
      return { completed: orderIds.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
