import { NextResponse } from "next/server";
import {
  assistantQuerySchema,
  publicAssistantSettings,
  type AssistantTurn,
} from "@/lib/assistant";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import {
  assistantRateLimit,
  getAssistantSettings,
  getAssistantThread,
  saveAssistantTurn,
  saveAssistantMetric,
} from "@/server/assistantRepository";
import { searchAssistant } from "@/server/assistantSearch";
import { explainAssistantResult } from "@/server/assistantAI";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 40;
export async function GET() {
  try {
    return NextResponse.json(
      publicAssistantSettings(await getAssistantSettings()),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  const began = Date.now();
  try {
    verifyOrigin(request);
    const query = await readBody(request, assistantQuerySchema, 14000);
    let userId: string | null = null;
    try {
      userId = await requireUser();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) throw e;
    }
    const settings = await getAssistantSettings();
    if (!settings.enabled)
      throw new ApiError(503, "小P暫時休息中，可以先使用選物本舖或客服。");
    await assistantRateLimit(request, userId);
    const thread =
      userId && query.threadId
        ? await getAssistantThread(userId, query.threadId, settings.historyDays)
        : null;
    const history = thread
      ? thread.turns.slice(-4).map((t) => ({
          question: t.question,
          productIds: t.result.products.map((p) => p.id),
        }))
      : query.history;
    const result = await searchAssistant(query, settings, userId, history);
    const elapsed = Date.now() - began;
    const threadId = thread?.id ?? query.requestId;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let connected = true;
        const send = (data: unknown) => {
          if (!connected) return;
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
          } catch {
            connected = false;
          }
        };
        send({
          type: "results",
          result,
          threadId,
          requestId: query.requestId,
          elapsedMs: elapsed,
          member: !!userId,
        });
        try {
          const explanation = await explainAssistantResult(
            query.question,
            result,
            settings,
          );
          const finalResult = { ...result, answer: explanation.answer };
          send({
            type: "answer",
            answer: explanation.answer,
            ai: explanation.state,
          });
          const turn: AssistantTurn = {
            id: query.requestId,
            question: query.question,
            answer: explanation.answer,
            result: finalResult,
            createdAt: new Date().toISOString(),
          };
          let saved = true;
          if (userId) {
            try {
              await saveAssistantTurn(userId, threadId, turn, !!query.threadId);
            } catch {
              saved = false;
            }
          }
          if (settings.analyticsEnabled) {
            try {
              await saveAssistantMetric({
                id: query.requestId,
                question: query.question,
                category: result.category,
                at: turn.createdAt,
                resultCount: result.products.length + result.documents.length,
                member: !!userId,
                ai: explanation.state,
                latencyMs: elapsed,
              });
            } catch {
              /* Search remains usable if telemetry fails. */
            }
          }
          send({ type: "done", turn, saved });
        } catch {
          send({
            type: "error",
            error: "站內結果已保留，這次說明暫時無法完成，請再問一次。",
          });
        }
        if (connected) {
          try {
            controller.close();
          } catch {
            /* Client already closed. */
          }
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
