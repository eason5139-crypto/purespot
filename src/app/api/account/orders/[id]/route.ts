import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError } from "@/server/http";
import { accountOrderInclude, formatAccountOrder } from "@/server/accountOrders";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const { id } = await params;
    const order = await db.order.findFirst({ where: { id, userId }, include: accountOrderInclude });
    if (!order) throw new ApiError(404, "找不到訂單");
    return NextResponse.json({ order: formatAccountOrder(order) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
