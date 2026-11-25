import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  deleteAssistantThreads,
  getAssistantSettings,
  listAssistantThreads,
} from "@/server/assistantRepository";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const userId = await requireUser(),
      settings = await getAssistantSettings();
    return NextResponse.json(
      {
        threads: await listAssistantThreads(userId, settings.historyDays),
        historyDays: settings.historyDays,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const body = await readBody(
      request,
      z.object({ id: z.string().uuid().optional() }).strict(),
    );
    await deleteAssistantThreads(userId, body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
