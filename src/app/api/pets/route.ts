import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { petSchema } from "@/lib/types";
export const runtime = "nodejs";
export async function GET() {
  try {
    const userId = await requireUser();
    const pets = await db.pet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(
      { pets },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(
      request,
      petSchema.omit({ id: true, avatarUrl: true }),
    );
    const birthday = new Date();
    birthday.setUTCMonth(birthday.getUTCMonth() - input.ageMonths);
    const { ageMonths, ...fields } = input;
    void ageMonths;
    const pet = await db.$transaction(
      async (tx) => {
        if ((await tx.pet.count({ where: { userId } })) >= 20)
          throw new ApiError(400, "每個帳戶最多建立 20 隻毛孩");
        return tx.pet.create({
          data: {
            ...fields,
            userId,
            birthday,
            chronicDiseases: [],
            weightRecords: { create: { weightKg: input.weightKg } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ pet }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
const updateSchema = petSchema
  .omit({ avatarUrl: true })
  .extend({ updatedAt: z.iso.datetime() });
export async function PATCH(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, updateSchema);
    const { id, ageMonths, updatedAt, ...fields } = input;
    const birthday = new Date();
    birthday.setUTCMonth(birthday.getUTCMonth() - ageMonths);
    const pet = await db.$transaction(async (tx) => {
      const result = await tx.pet.updateMany({
        where: { id, userId, updatedAt: new Date(updatedAt) },
        data: { ...fields, birthday },
      });
      if (result.count !== 1)
        throw new ApiError(409, "毛孩資料已更新或不存在，請重新整理");
      await tx.weightRecord.create({
        data: { petId: id, weightKg: input.weightKg },
      });
      return tx.pet.findUnique({ where: { id } });
    });
    return NextResponse.json({ pet });
  } catch (e) {
    return apiError(e);
  }
}
