import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { addressFields } from "@/lib/accountSchemas";

export const runtime = "nodejs";
const idInput = z.object({ id: z.string().min(1).max(100) }).strict();

export async function GET() {
  try {
    const userId = await requireUser();
    const addresses = await db.savedAddress.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
    return NextResponse.json({ addresses }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, addressFields);
    const address = await db.$transaction(async (tx) => {
      const count = await tx.savedAddress.count({ where: { userId } });
      if (count >= 10) throw new ApiError(400, "最多可儲存 10 組地址");
      const makeDefault = input.isDefault || count === 0;
      if (makeDefault) await tx.savedAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.savedAddress.create({ data: { ...input, userId, isDefault: makeDefault } });
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, idInput.extend({ address: addressFields }));
    const address = await db.$transaction(async (tx) => {
      const old = await tx.savedAddress.findFirst({ where: { id: input.id, userId } });
      if (!old) throw new ApiError(404, "找不到收件地址");
      if (input.address.isDefault) await tx.savedAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.savedAddress.update({ where: { id: old.id }, data: { ...input.address, isDefault: input.address.isDefault || old.isDefault } });
    });
    return NextResponse.json({ address });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { id } = await readBody(request, idInput);
    await db.$transaction(async (tx) => {
      const old = await tx.savedAddress.findFirst({ where: { id, userId } });
      if (!old) throw new ApiError(404, "找不到收件地址");
      await tx.savedAddress.delete({ where: { id: old.id } });
      if (old.isDefault) {
        const next = await tx.savedAddress.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
        if (next) await tx.savedAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
