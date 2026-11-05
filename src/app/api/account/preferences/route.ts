import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { preferenceFields } from "@/lib/accountSchemas";

export const runtime = "nodejs";
const defaults = { orderUpdates: true, refillReminders: true, restockAlerts: true, careReminders: true };

export async function GET() {
  try {
    const userId = await requireUser();
    const preferences = await db.accountPreference.findUnique({ where: { userId } });
    return NextResponse.json({ preferences: preferences ? {
      orderUpdates: preferences.orderUpdates,
      refillReminders: preferences.refillReminders,
      restockAlerts: preferences.restockAlerts,
      careReminders: preferences.careReminders,
    } : defaults }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, preferenceFields);
    await db.accountPreference.upsert({ where: { userId }, create: { userId, ...input }, update: input });
    return NextResponse.json({ preferences: input });
  } catch (error) { return apiError(error); }
}
