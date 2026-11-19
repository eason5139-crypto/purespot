import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  claimArcadeTask,
  claimDailyCheckIn,
  exchangePointsShopItem,
  membershipSnapshot,
  playFukubiki,
  playPetWheel,
  playScratchCard,
  redeemReward,
} from "@/server/membership";
import { recordTaskSignal } from "@/server/pointsArcadeRepository";
import { WHEEL_KEYS } from "@/lib/pointsArcadeConfig";
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
      action: z.literal("check_in"),
    })
    .strict(),
  z
    .object({
      action: z.literal("play_wheel"),
      wheelKey: z.enum(WHEEL_KEYS),
    })
    .strict(),
  z
    .object({
      action: z.literal("play_fukubiki"),
    })
    .strict(),
  z
    .object({
      action: z.literal("play_scratch"),
    })
    .strict(),
  z
    .object({
      action: z.literal("claim_task"),
      taskKey: z.string().min(1).max(60),
    })
    .strict(),
  z
    .object({
      action: z.literal("record_task_signal"),
      taskKey: z.enum([
        "daily_browse_shop",
        "daily_community_interact",
        "mile_nutrition_calc",
      ]),
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
    if (input.action === "check_in") {
      const checkIn = await claimDailyCheckIn(userId);
      return NextResponse.json({ checkIn }, { status: 201 });
    }
    if (input.action === "play_wheel") {
      const result = await playPetWheel(userId, input.wheelKey);
      return NextResponse.json({ result }, { status: 201 });
    }
    if (input.action === "play_fukubiki") {
      const result = await playFukubiki(userId);
      return NextResponse.json({ result }, { status: 201 });
    }
    if (input.action === "play_scratch") {
      const result = await playScratchCard(userId);
      return NextResponse.json({ result }, { status: 201 });
    }
    if (input.action === "claim_task") {
      const result = await claimArcadeTask(userId, input.taskKey);
      return NextResponse.json({ result }, { status: 201 });
    }
    if (input.action === "record_task_signal") {
      await recordTaskSignal(userId, input.taskKey);
      return NextResponse.json({ ok: true });
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
