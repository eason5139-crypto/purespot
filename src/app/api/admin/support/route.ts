import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { listAllSupportThreads } from "@/server/supportRepository";
import {
  adminUpdateSupport,
  getSupportSettings,
  saveSupportSettings,
} from "@/server/supportOperations";
import { CATEGORY_IDS, supportSettingsSchema } from "@/lib/supportDesk";
import { db } from "@/server/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const orderId = new URL(request.url).searchParams.get("orderId");
    if (orderId)
      return NextResponse.json(
        {
          order: await db.order.findUnique({
            where: { id: orderId },
            select: {
              id: true,
              userId: true,
              status: true,
              totalNt: true,
              createdAt: true,
              items: {
                select: {
                  productName: true,
                  quantity: true,
                  unitPriceNt: true,
                },
              },
            },
          }),
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    const [threads, settings] = await Promise.all([
      listAllSupportThreads(),
      getSupportSettings(),
    ]);
    return NextResponse.json(
      { threads, requests: threads, settings },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
const changes = {
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
  response: z.string().trim().max(1500).nullish(),
  category: z.enum(CATEGORY_IDS).optional(),
  note: z.string().trim().max(1500).optional(),
  tags: z.array(z.string().trim().min(1).max(20)).max(20).optional(),
  requestId: z.string().uuid().optional(),
};
const schema = z.union([
  z
    .object({
      id: z.string().min(1).max(120),
      ...changes,
      expectedVersion: z.number().int().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("batch"),
      ids: z.array(z.string().min(1).max(120)).min(1).max(20),
      status: z.literal("RESOLVED").optional(),
      category: z.enum(CATEGORY_IDS).optional(),
      requestId: z.string().uuid(),
    })
    .strict()
    .refine((v) => v.status || v.category, "請選擇批次操作"),
  z
    .object({ action: z.literal("settings"), settings: supportSettingsSchema })
    .strict(),
]);
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession();
    verifyOrigin(request);
    const input = await readBody(request, schema);
    if ("action" in input && input.action === "settings")
      return NextResponse.json({
        settings: await saveSupportSettings(input.settings),
      });
    const result = await adminUpdateSupport({
      ...input,
      ids: "ids" in input ? input.ids : [input.id],
      adminName: admin.username,
      requestId: input.requestId ?? randomUUID(),
    });
    return NextResponse.json({
      threads: result,
      thread: result[0],
      request: result[0],
    });
  } catch (e) {
    return apiError(e);
  }
}
