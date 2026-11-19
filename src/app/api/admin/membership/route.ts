import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { membershipConfig } from "@/server/membership";
import {
  getArcadeConfig,
  saveArcadeConfig,
} from "@/server/pointsArcadeRepository";
import { pointsArcadeConfigSchema } from "@/lib/pointsArcadeConfig";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminSession();
    const [config, rewards, missions, arcadeConfig] = await Promise.all([
      membershipConfig(),
      db.reward.findMany({ orderBy: { createdAt: "asc" } }),
      db.memberMission.findMany({ orderBy: { id: "asc" } }),
      getArcadeConfig(),
    ]);
    return NextResponse.json(
      { config, rewards, missions, arcadeConfig },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

const inputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("config"),
      silverSpendNt: z.number().int().min(0).max(10000000),
      goldSpendNt: z.number().int().min(0).max(10000000),
      pointsPerHundred: z.number().int().min(0).max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal("reward"),
      id: z.string().optional(),
      title: z.string().trim().min(2).max(60),
      pointsCost: z.number().int().min(1).max(100000),
      discountNt: z.number().int().min(1).max(100000),
      isActive: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("mission"),
      id: z.enum(["pet", "care", "favorite", "family", "community"]),
      title: z.string().trim().min(2).max(80),
      badgeTitle: z.string().trim().min(2).max(40),
      points: z.number().int().min(0).max(1000),
      isActive: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("arcade"),
      arcadeConfig: pointsArcadeConfigSchema,
    })
    .strict(),
]);

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    await requireAdminSession();
    const input = await readBody(request, inputSchema);

    if (input.action === "config") {
      if (input.goldSpendNt <= input.silverSpendNt) {
        return NextResponse.json(
          { error: "高等級門檻須高於中等級" },
          { status: 400 },
        );
      }
      const { action: _, ...data } = input;
      const config = await db.membershipConfig.upsert({
        where: { id: "main" },
        create: { id: "main", ...data },
        update: data,
      });
      return NextResponse.json({ config });
    }

    if (input.action === "mission") {
      const { action: _, id, ...data } = input;
      const mission = await db.memberMission.update({ where: { id }, data });
      return NextResponse.json({ mission });
    }

    if (input.action === "arcade") {
      const arcadeConfig = await saveArcadeConfig(input.arcadeConfig);
      return NextResponse.json({ arcadeConfig });
    }

    const { action: _, id, ...data } = input;
    const reward = id
      ? await db.reward.update({ where: { id }, data })
      : await db.reward.create({ data });
    return NextResponse.json({ reward });
  } catch (error) {
    return apiError(error);
  }
}
