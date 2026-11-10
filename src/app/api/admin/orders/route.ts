import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { requireAdminSession } from "@/server/adminAuth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { checkoutPaymentMethod } from "@/server/checkoutOrder";

export const runtime = "nodejs";

const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "DISPATCHED",
    "COMPLETED",
    "CANCELLED",
  ]),
});

// 公司端依條件分頁取得訂單，避免大量訂單被截斷。
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const params = new URL(request.url).searchParams;
    const requestedPage = Number(params.get("page") ?? 1);
    const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(1000, requestedPage)) : 1;
    const pageSize = 50;
    const query = params.get("q")?.trim().slice(0, 80) ?? "";
    const requestedStatus = params.get("status") ?? "ALL";
    const statuses = ["PENDING_PAYMENT", "PAID", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED"] as const;
    if (requestedStatus !== "ALL" && !statuses.includes(requestedStatus as typeof statuses[number])) throw new ApiError(400, "訂單狀態不正確");
    const where: Prisma.OrderWhereInput = {
      ...(requestedStatus !== "ALL" ? { status: requestedStatus as typeof statuses[number] } : {}),
      ...(query ? { OR: [
        { id: { contains: query, mode: "insensitive" } },
        { user: { is: { name: { contains: query, mode: "insensitive" } } } },
        { user: { is: { email: { contains: query, mode: "insensitive" } } } },
      ] } : {}),
    };
    const [orders, total] = await Promise.all([db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true,
      },
    }), db.order.count({ where })]);

    const formattedOrders = orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalNt: o.totalNt,
      subtotalNt: o.subtotalNt,
      shippingNt: o.shippingNt,
      createdAt: o.createdAt.toISOString(),
      customerName: o.user?.name || "顧客",
      customerEmail: o.user?.email || "未提供",
      customerPhone: o.user?.phone || "未提供",
      paymentMethod: checkoutPaymentMethod(o.paymentReference),
      shippingAddress: o.shippingAddress,
      items: o.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        quantity: i.quantity,
        unitPriceNt: i.unitPriceNt,
        isAutoship: i.isAutoship,
      })),
    }));

    return NextResponse.json({ orders: formattedOrders, total, page, pageSize });
  } catch (error) {
    return apiError(error);
  }
}

// 公司端修改訂單狀態（連動進銷存：取消時自動還原庫存）
export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const { orderId, status } = await readBody(request, updateOrderStatusSchema);

    const allowed: Record<string, string[]> = {
      PENDING_PAYMENT: ["PAID", "CANCELLED"],
      PAID: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["DISPATCHED", "CANCELLED"],
      DISPATCHED: ["COMPLETED"],
      COMPLETED: [],
      CANCELLED: [],
    };
    const updated = await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!current) throw new ApiError(404, "找不到該訂單");
      if (current.status === status) return current;
      if (!allowed[current.status]?.includes(status)) throw new ApiError(400, "此訂單無法變更為所選狀態");
      const changed = await tx.order.updateMany({ where: { id: orderId, status: current.status }, data: { status } });
      if (changed.count !== 1) throw new ApiError(409, "訂單狀態已變更，請重新整理");
      const demand = new Map<string, number>();
      for (const item of current.items) demand.set(item.variantId, (demand.get(item.variantId) ?? 0) + item.quantity);
      for (const [variantId, quantity] of demand) {
        if (current.status === "PENDING_PAYMENT" && status === "PAID") {
          const reserved = await tx.productVariant.updateMany({ where: { id: variantId, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
          if (reserved.count !== 1) throw new ApiError(409, "商品庫存不足，無法確認訂單");
        } else if (["PAID", "PROCESSING"].includes(current.status) && status === "CANCELLED") {
          await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: quantity } } });
        }
      }
      return tx.order.findUniqueOrThrow({ where: { id: orderId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    return apiError(error);
  }
}
