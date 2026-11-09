import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { adjustStock, inventorySpending, stockLineSchema } from "@/server/stockAdjustment";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminSession();
    const [spending, logs] = await Promise.all([
      inventorySpending(),
      db.stockMovement.findMany({ include: { variant: { include: { product: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return NextResponse.json({ spending, logs: logs.map((entry) => ({ ...entry, productId: entry.variant.productId, productName: entry.variant.product.name, variant: undefined })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(); verifyOrigin(request);
    const { items } = await readBody(request, z.object({ items: z.array(stockLineSchema).min(1).max(80) }).strict());
    return NextResponse.json(await adjustStock(items));
  } catch (error) { return apiError(error); }
}
