import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  claimDailyDraw,
  exchangePointsShopItem,
  membershipSnapshot,
  redeemReward,
} from "@/server/membership";
import { db } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUser();
    return NextResponse.json(await membershipSnapshot(userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

const inputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("redeem"),
      rewardId: z.string().min(1).max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal("exchange_shop"),
      itemId: z.string().min(1).max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal("daily_draw"),
    })
    .strict(),
  z
    .object({
      action: z.literal("read"),
      notificationId: z.string().uuid(),
    })
    .strict(),
]);

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, inputSchema);

    if (input.action === "redeem") {
      const redemption = await redeemReward(userId, input.rewardId);
      return NextResponse.json({ redemption }, { status: 201 });
    }
    if (input.action === "exchange_shop") {
      const result = await exchangePointsShopItem(userId, input.itemId);
      return NextResponse.json(result, { status: 201 });
    }
    if (input.action === "daily_draw") {
      const draw = await claimDailyDraw(userId);
      return NextResponse.json({ draw }, { status: 201 });
    }

    await db.memberNotification.updateMany({
      where: { id: input.notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
