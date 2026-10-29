import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { readBody, apiError, verifyOrigin } from "@/server/http";
import { requireAdminSession } from "@/server/adminAuth";

export const runtime = "nodejs";

const stockAdjustSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, { message: "調整量不可為 0" }),
  type: z.enum(["restock", "adjustment", "deduction"]),
  note: z.string().max(200).default(""),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    verifyOrigin(request);

    const { id } = await params;
    const { delta, note } = await readBody(request, stockAdjustSchema);

    // 找出對應商品的所有 variants（PURESPOT 庫存存在 ProductVariant.stock）
    const variants = await db.productVariant.findMany({
      where: { productId: id },
    });

    const variant = variants[0];
    if (!variant) {
      return NextResponse.json({ error: "找不到對應商品規格" }, { status: 404 });
    }

    const newStock = variant.stock + delta;

    if (newStock < 0) {
      return NextResponse.json({ error: "庫存不可低於 0" }, { status: 400 });
    }

    await db.productVariant.update({
      where: { id: variant.id },
      data: { stock: newStock },
    });

    return NextResponse.json({
      success: true,
      variantId: variant.id,
      stock: newStock,
      delta,
      note,
    });
  } catch (error) {
    return apiError(error);
  }
}

