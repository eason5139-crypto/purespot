import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  appendBuyerMessage,
  createSupportThread,
  getUserTierProfile,
  listAllSupportThreads,
  listBuyerThreads,
} from "@/server/supportRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function optionalUserId(): Promise<string | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await optionalUserId();
    const { searchParams } = new URL(request.url);
    const clientToken = searchParams.get("clientToken")?.trim() || "";

    const [profile, ownThreads, allThreads] = await Promise.all([
      getUserTierProfile(userId),
      listBuyerThreads({ userId, clientToken }),
      listAllSupportThreads(),
    ]);

    const threads =
      ownThreads.length > 0 ? ownThreads : allThreads.slice(0, 2);

    return NextResponse.json(
      {
        profile,
        threads,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

const createSchema = z
  .object({
    action: z.literal("create"),
    clientToken: z.string().min(1).max(120),
    buyerName: z.string().trim().max(60).optional(),
    buyerEmail: z.string().trim().max(120).optional(),
    category: z.enum([
      "NUTRITION",
      "ALLERGY",
      "AUTOSHIP",
      "ORDER",
      "AFTER_SALES",
    ]),
    subject: z.string().trim().min(2, "請輸入問題主旨").max(120),
    message: z.string().trim().min(4, "請輸入問題內容").max(1500),
    orderId: z.string().trim().max(80).nullable().optional(),
    petSummary: z.string().trim().max(240).nullable().optional(),
  })
  .strict();

const replySchema = z
  .object({
    action: z.literal("reply"),
    clientToken: z.string().min(1).max(120),
    threadId: z.string().min(1).max(120),
    message: z.string().trim().min(2, "請輸入追問訊息").max(1500),
  })
  .strict();

const postSchema = z.discriminatedUnion("action", [createSchema, replySchema]);

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await optionalUserId();
    const input = await readBody(request, postSchema);

    if (input.action === "create") {
      const thread = await createSupportThread({
        userId,
        clientToken: input.clientToken,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,
        category: input.category,
        subject: input.subject,
        message: input.message,
        orderId: input.orderId ?? null,
        petSummary: input.petSummary ?? null,
      });
      return NextResponse.json({ thread }, { status: 201 });
    }

    const updated = await appendBuyerMessage({
      threadId: input.threadId,
      userId,
      clientToken: input.clientToken,
      message: input.message,
    });
    if (!updated) {
      return NextResponse.json(
        { error: "找不到該筆客服對話" },
        { status: 404 },
      );
    }

    return NextResponse.json({ thread: updated });
  } catch (error) {
    return apiError(error);
  }
}
