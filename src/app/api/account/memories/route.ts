import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { apiError } from "@/server/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    const userId = await requireUser();
    const orders = await db.order.findMany({
      where: { userId, status: { in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"] } },
      select: { id: true, createdAt: true, totalNt: true, items: { select: { productName: true, quantity: true, pet: { select: { name: true } }, variant: { select: { product: { select: { imageUrl: true, slug: true } } } } } } },
      orderBy: { createdAt: "desc" }, take: 500,
    });
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
