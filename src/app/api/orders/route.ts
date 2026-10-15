import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { createOrderDraft, orderInputSchema } from "@/server/orderService";
import { rateLimit } from "@/server/rateLimit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`order:${userId}`, 30, 60);
    const input = await readBody(request, orderInputSchema);
    const order = await createOrderDraft(userId, input);
    return NextResponse.json(
      {
        order,
        paymentAvailable: false,
        message: "訂單草稿已儲存，付款服務尚未啟用，不會扣款或出貨",
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
    const orders = await db.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true },
    });
    return NextResponse.json(
      { orders },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
