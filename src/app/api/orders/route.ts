import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { createOrder, orderInputSchema } from "@/server/orderService";
import { rateLimit } from "@/server/rateLimit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`order:${userId}`, 30, 60);
    const input = await readBody(request, orderInputSchema);
    const order = await createOrder(userId, input, `CHECKOUT:legacy:${input.idempotencyKey}`);
    return NextResponse.json(
      {
        order,
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function GET() {
  try {
    const userId = await requireUser();
    const [orders, totalOrdersCount] = await Promise.all([
      db.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { items: true },
      }),
      db.order.count({ where: { userId, status: { in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"] } } }),
    ]);
    return NextResponse.json(
      { totalOrdersCount, orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalNt: order.totalNt,
        createdAt: order.createdAt,
        items: order.items,
      })) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
