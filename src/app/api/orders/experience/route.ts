import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { createExperienceOrder, experienceOrderSchema } from "@/server/experienceOrder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`experience-order:${userId}`, 20, 60);
    const input = await readBody(request, experienceOrderSchema);
    const order = await createExperienceOrder(userId, input);
    return NextResponse.json({
      order: { id: order.id, status: order.status, totalNt: order.totalNt },
      paymentAvailable: false,
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
