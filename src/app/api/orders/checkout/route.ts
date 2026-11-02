import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { createCheckoutOrder, checkoutOrderSchema } from "@/server/checkoutOrder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`checkout-order:${userId}`, 20, 60);
    const input = await readBody(request, checkoutOrderSchema);
    const order = await createCheckoutOrder(userId, input);
    return NextResponse.json({
      order: { id: order.id, status: order.status, totalNt: order.totalNt },
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
