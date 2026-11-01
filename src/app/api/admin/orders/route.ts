import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { requireAdminSession } from "@/server/adminAuth";
import { z } from "zod";
import { isExperienceOrder } from "@/server/experienceOrder";

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
      isExperience: isExperienceOrder(o.paymentReference),
      paymentMethod: isExperienceOrder(o.paymentReference) ? o.paymentReference?.split(":")[1] : null,
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

    const current = await db.order.findUnique({ where: { id: orderId } });
    if (!current) throw new ApiError(404, "找不到該訂單");
    if (isExperienceOrder(current.paymentReference) && status === "PAID")
      throw new ApiError(400, "體驗流程沒有實際收款，不能標記為已付款");
    // 草稿建立時未扣庫存，狀態變更也不得憑空增減庫存。
    const updated = await db.order.update({ where: { id: orderId }, data: { status } });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    return apiError(error);
  }
}
