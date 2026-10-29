import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { requireAdminSession } from "@/server/adminAuth";
import { z } from "zod";

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

// 公司端取得所有即時訂單列表
export async function GET() {
  try {
    await requireAdminSession();
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true,
      },
    });

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
      shippingAddress: o.shippingAddress,
      items: o.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        quantity: i.quantity,
        unitPriceNt: i.unitPriceNt,
        isAutoship: i.isAutoship,
      })),
    }));

    return NextResponse.json({ orders: formattedOrders });
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

    const updated = await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!current) throw new Error("找不到該訂單");

      // 若從非取消狀態轉為取消，將品項庫存返還
      if (current.status !== "CANCELLED" && status === "CANCELLED") {
        for (const item of current.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
      // 若從取消狀態恢復，重新扣除庫存
      if (current.status === "CANCELLED" && status !== "CANCELLED") {
        for (const item of current.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    return apiError(error);
  }
}
