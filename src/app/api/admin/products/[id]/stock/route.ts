import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { readBody, apiError, verifyOrigin } from "@/server/http";
import { requireAdminSession } from "@/server/adminAuth";
import { adjustStock, stockAdjustmentInputSchema } from "@/server/stockAdjustment";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession(); verifyOrigin(request);
    const { id } = await params;
    const input = await readBody(request, stockAdjustmentInputSchema);
    const product = await db.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "找不到商品" }, { status: 404 });
    const result = await adjustStock([{ ...input, productId: id }]);
    return NextResponse.json({ success: true, stock: result.items[0]?.stock, movement: result.items[0]?.movement, batchId: result.batchId });
  } catch (error) { return apiError(error); }
}
