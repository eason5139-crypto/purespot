import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
export const runtime = "nodejs";
const schema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    action: z.enum(["delay", "pause", "resume"]),
  })
  .strict();
export async function GET() {
  try {
    const userId = await requireUser();
    const plans = await db.autoshipPlan.findMany({
      where: { userId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(
      { plans },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, schema);
    const plan = await db.$transaction(async (tx) => {
      const current = await tx.autoshipPlan.findFirst({
        where: { id: input.id, userId, revision: input.revision },
      });
      if (!current) throw new ApiError(409, "計畫已更新或不存在，請重新整理");
      if (current.status === "DRAFT" || current.status === "CANCELLED")
        throw new ApiError(409, "此計畫尚未啟用或已取消");
      if (input.action === "delay" && current.status !== "ACTIVE")
        throw new ApiError(409, "暫停的計畫無法順延");
      if (input.action === "resume" && !current.paymentMethodToken)
        throw new ApiError(409, "請先完成付款方式授權");
      const nextBillingDate = new Date(current.nextBillingDate);
      if (input.action === "delay")
        nextBillingDate.setUTCDate(nextBillingDate.getUTCDate() + 7);
      if (input.action === "resume" && nextBillingDate <= new Date())
        nextBillingDate.setTime(Date.now() + 3 * 86_400_000);
      const status =
        input.action === "pause"
          ? "PAUSED"
          : input.action === "resume"
            ? "ACTIVE"
            : current.status;
      const result = await tx.autoshipPlan.updateMany({
        where: { id: input.id, userId, revision: input.revision },
        data: {
          nextBillingDate,
          status,
          isActive: status === "ACTIVE",
          revision: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ApiError(409, "計畫已被更新，請重新整理");
      return tx.autoshipPlan.findUnique({ where: { id: input.id } });
    });
    return NextResponse.json({ plan, message: "補貨計畫已更新" });
  } catch (e) {
    return apiError(e);
  }
}
