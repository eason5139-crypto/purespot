import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    const userId = await requireUser();
    const [pets, records, moments] = await Promise.all([
      db.pet.findMany({ where: { userId }, select: { id: true, name: true, avatarUrl: true, type: true }, orderBy: { createdAt: "asc" } }),
      db.careRecord.findMany({ where: { userId }, select: { id: true, petId: true, kind: true, note: true, weightKg: true, recordedAt: true }, orderBy: { recordedAt: "desc" }, take: 200 }),
      db.growthMoment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return NextResponse.json({ pets, records, moments }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

const createSchema = z.object({ careRecordId: z.string().uuid(), title: z.string().trim().min(2).max(80), note: z.string().trim().max(300) }).strict();
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, createSchema);
    const record = await db.careRecord.findFirst({ where: { id: input.careRecordId, userId } });
    if (!record) throw new ApiError(404, "找不到這筆照顧紀錄");
    const moment = await db.growthMoment.create({ data: { userId, petId: record.petId, careRecordId: record.id, title: input.title, note: input.note } });
    return NextResponse.json({ moment }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, z.object({ id: z.string().uuid() }).strict());
    await db.growthMoment.deleteMany({ where: { id: input.id, userId } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
