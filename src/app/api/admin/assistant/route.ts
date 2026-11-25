import { NextResponse } from "next/server";
import {
  assistantSettingsSchema,
  ASSISTANT_FALLBACK_MODEL,
  buildAssistantAnalytics,
} from "@/lib/assistant";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  assistantMetrics,
  getAssistantSettings,
  saveAssistantSettings,
  pruneAssistantData,
} from "@/server/assistantRepository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const settings = await getAssistantSettings();
    const input = Number(new URL(request.url).searchParams.get("days") || 30),
      days = [7, 30, 90].includes(input)
        ? Math.min(input, settings.analyticsDays)
        : Math.min(30, settings.analyticsDays);
    const metrics = await assistantMetrics(days);
    return NextResponse.json(
      {
        settings,
        analytics: buildAssistantAnalytics(metrics, days),
        days,
        aiConfigured: !!process.env.GEMINI_API_KEY,
        model: `${process.env.GEMINI_MODEL || "gemini-2.5-flash"}；備援 ${ASSISTANT_FALLBACK_MODEL}`,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const settings = await saveAssistantSettings(
      await readBody(request, assistantSettingsSchema, 110000),
    );
    await pruneAssistantData(settings);
    return NextResponse.json({ settings });
  } catch (e) {
    return apiError(e);
  }
}
