import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { careRecordFields, reminderFields } from "@/lib/accountSchemas";

export const runtime = "nodejs";
const createInput = z.discriminatedUnion("action", [
  careRecordFields.extend({ action: z.literal("record") }),
  reminderFields.extend({ action: z.literal("reminder") }),
]);
const idInput = z.object({ id: z.string().min(1).max(100) }).strict();

export async function GET() {
  try {
    const userId = await requireUser();
    const [records, reminders] = await Promise.all([
      db.careRecord.findMany({ where: { userId }, orderBy: { recordedAt: "desc" }, take: 100 }),
      db.careReminder.findMany({ where: { userId }, orderBy: { dueAt: "asc" }, take: 100 }),
    ]);
    return NextResponse.json({ records, reminders }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, createInput);
    const pet = await db.pet.findFirst({ where: { id: input.petId, userId }, select: { id: true } });
    if (!pet) throw new ApiError(404, "找不到毛孩檔案，請先同步毛孩資料");
    if (input.action === "reminder") {
      const reminder = await db.careReminder.create({ data: { userId, petId: pet.id, title: input.title, dueAt: new Date(input.dueAt), repeatDays: input.repeatDays ?? null } });
      return NextResponse.json({ reminder }, { status: 201 });
    }
    if (input.kind === "WEIGHT" && !input.weightKg) throw new ApiError(400, "請填寫體重");
    const record = await db.$transaction(async (tx) => {
      const created = await tx.careRecord.create({ data: { userId, petId: pet.id, kind: input.kind, note: input.note, weightKg: input.kind === "WEIGHT" ? input.weightKg : null } });
      if (input.kind === "WEIGHT" && input.weightKg) {
        await tx.pet.update({ where: { id: pet.id }, data: { weightKg: input.weightKg } });
        await tx.weightRecord.create({ data: { petId: pet.id, weightKg: input.weightKg } });
      }
      return created;
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { id } = await readBody(request, idInput);
    const reminder = await db.$transaction(async (tx) => {
      const current = await tx.careReminder.findFirst({ where: { id, userId } });
      if (!current) throw new ApiError(404, "找不到提醒");
      if (current.completedAt) return current;
      const changed = await tx.careReminder.updateMany({ where: { id, userId, completedAt: null }, data: { completedAt: new Date() } });
      if (changed.count !== 1) throw new ApiError(409, "提醒已完成，請重新整理");
      const completed = await tx.careReminder.findUniqueOrThrow({ where: { id } });
      if (current.repeatDays) {
        const next = new Date(Math.max(current.dueAt.getTime(), Date.now()));
        next.setUTCDate(next.getUTCDate() + current.repeatDays);
        await tx.careReminder.create({ data: { userId, petId: current.petId, title: current.title, dueAt: next, repeatDays: current.repeatDays } });
      }
      return completed;
    });
    return NextResponse.json({ reminder });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, idInput.extend({ type: z.enum(["record", "reminder"]) }));
    if (input.type === "reminder") await db.careReminder.deleteMany({ where: { id: input.id, userId } });
    else {
      const record = await db.careRecord.findFirst({ where: { id: input.id, userId } });
      if (record?.kind === "WEIGHT") throw new ApiError(400, "體重紀錄已同步健康資料，請新增一筆修正紀錄");
      await db.careRecord.deleteMany({ where: { id: input.id, userId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
