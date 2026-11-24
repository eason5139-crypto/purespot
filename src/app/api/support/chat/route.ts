import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { listBuyerThreads } from "@/server/supportRepository";
import {
  appendBuyerMessage,
  claimSupport,
  createSupportThread,
  getSupportSettings,
  mutateSupport,
  rateSupport,
  supportBrowserKey,
} from "@/server/supportOperations";
import { buyerTicket, CATEGORY_IDS } from "@/lib/supportDesk";
import { db } from "@/server/db";
import { rateLimit } from "@/server/rateLimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function user() {
  try {
    return await requireUser();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}
export async function GET(request: Request) {
  try {
    const [userId, browserKey] = await Promise.all([
      user(),
      supportBrowserKey(),
    ]);
    const legacy = new URL(request.url).searchParams.get("clientToken");
    if (legacy && /^client-\d{13}-[a-z0-9]{6,}$/.test(legacy)) {
      const old = (
        await listBuyerThreads({ userId: null, clientToken: legacy })
      ).filter((t) => !t.userId && t.source === "CHAT");
      for (let i = 0; i < old.length; i += 20)
        await mutateSupport(
          old.slice(i, i + 20).map((t) => t.id),
          browserKey,
          randomUUID(),
          (t) => {
            if (t.userId || t.clientToken !== legacy)
              throw new ApiError(409, "紀錄已認領，請更新後確認");
            return { ...t, clientToken: browserKey };
          },
        );
    }
    const [threads, settings, orders] = await Promise.all([
      listBuyerThreads({ userId, clientToken: browserKey }),
      getSupportSettings(),
      userId
        ? db.order.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, totalNt: true, createdAt: true },
            take: 100,
          })
        : Promise.resolve([]),
    ]);
    return NextResponse.json(
      {
        threads: threads.map(buyerTicket),
        settings: {
          ...settings,
          categories: settings.categories.map((c) => ({ ...c, templates: [] })),
        },
        orders,
        guestCount: threads.filter((t) => !t.userId).length,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
const common = {
  requestId: z.string().uuid().optional(),
  clientToken: z.string().max(120).optional(),
};
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      ...common,
      buyerName: z.string().trim().max(60).optional(),
      buyerEmail: z.union([z.email(), z.literal("")]).optional(),
      category: z.enum(CATEGORY_IDS),
      subject: z.string().trim().min(2).max(120),
      message: z.string().trim().min(2).max(1500),
      orderId: z.string().max(80).nullish(),
      petSummary: z.string().max(240).nullish(),
      parentId: z.string().max(120).nullish(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reply"),
      ...common,
      threadId: z.string().min(1).max(120),
      message: z.string().trim().min(2).max(1500),
    })
    .strict(),
  z
    .object({
      action: z.literal("rate"),
      ...common,
      id: z.string().min(1).max(120),
      score: z.number().int().min(1).max(5),
      comment: z.string().trim().max(500),
    })
    .strict(),
  z
    .object({
      action: z.literal("claim"),
      requestId: z.string().uuid().optional(),
    })
    .strict(),
]);
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const [userId, clientToken] = await Promise.all([
      user(),
      supportBrowserKey(),
    ]);
    const input = await readBody(request, schema);
    await rateLimit(`support:${userId ?? clientToken}`, 80, 900);
    if (input.action === "claim") {
      if (!userId) throw new ApiError(401, "登入後即可認領紀錄");
      return NextResponse.json({
        claimed: await claimSupport(userId, clientToken),
      });
    }
    const requestId = input.requestId ?? randomUUID();
    const thread =
      input.action === "create"
        ? await createSupportThread({
            ...input,
            userId,
            clientToken,
            requestId,
          })
        : input.action === "reply"
          ? await appendBuyerMessage({
              ...input,
              userId,
              clientToken,
              requestId,
            })
          : await rateSupport({ ...input, userId, clientToken, requestId });
    return NextResponse.json(
      { thread: buyerTicket(thread) },
      { status: input.action === "create" ? 201 : 200 },
    );
  } catch (e) {
    return apiError(e);
  }
}
