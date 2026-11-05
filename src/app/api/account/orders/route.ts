import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { apiError } from "@/server/http";
import { accountOrderInclude, formatAccountOrder } from "@/server/accountOrders";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const userId = await requireUser();
    const requestedPage = Number(new URL(request.url).searchParams.get("page"));
    const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(1000, requestedPage)) : 1;
    const [orders, count] = await Promise.all([
      db.order.findMany({ where: { userId }, include: accountOrderInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * 10, take: 10 }),
      db.order.count({ where: { userId } }),
    ]);
    return NextResponse.json({ orders: orders.map(formatAccountOrder), count, page, pageSize: 10 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
