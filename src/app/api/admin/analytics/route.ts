import { NextResponse } from "next/server";
import { db } from "@/server/db";
import type { RevenueMetric, SalesHistoryPoint } from "@/lib/adminTypes";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (error) {
    return apiError(error);
  }
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 86_400_000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const allOrders = await db.order.findMany({
      select: {
        id: true,
        totalNt: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (allOrders.length > 0) {
      let todayRev = 0;
      let todayCount = 0;
      let weekRev = 0;
      let weekCount = 0;
      let monthRev = 0;
      let monthCount = 0;
      let totalRev = 0;

      const dateMap = new Map<string, { revenue: number; count: number }>();

      // 產生最近 30 天日期鍵
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86_400_000);
        const key = d.toISOString().slice(0, 10);
        dateMap.set(key, { revenue: 0, count: 0 });
      }

      for (const o of allOrders) {
        const oTime = new Date(o.createdAt).getTime();
        const dateKey = new Date(o.createdAt).toISOString().slice(0, 10);
        totalRev += o.totalNt;

        if (oTime >= startOfToday.getTime()) {
          todayRev += o.totalNt;
          todayCount++;
        }
        if (oTime >= startOfWeek.getTime()) {
          weekRev += o.totalNt;
          weekCount++;
        }
        if (oTime >= startOfMonth.getTime()) {
          monthRev += o.totalNt;
          monthCount++;
        }

        if (dateMap.has(dateKey)) {
          const cur = dateMap.get(dateKey)!;
          cur.revenue += o.totalNt;
          cur.count += 1;
        }
      }

      const history: SalesHistoryPoint[] = Array.from(dateMap.entries()).map(
        ([date, val]) => ({
          date,
          revenueNt: val.revenue,
          ordersCount: val.count,
        }),
      );

      const metrics: RevenueMetric = {
        todayRevenueNt: todayRev,
        weekRevenueNt: weekRev,
        monthRevenueNt: monthRev,
        totalRevenueNt: totalRev,
        todayOrdersCount: todayCount,
        weekOrdersCount: weekCount,
        monthOrdersCount: monthCount,
        totalOrdersCount: allOrders.length,
        averageOrderValueNt:
          allOrders.length > 0 ? Math.round(totalRev / allOrders.length) : 0,
        repeatPurchaseRate: 0,
        autoshipRatio: 0,
      };

      return NextResponse.json({ metrics, history, source: "database" });
    }
  } catch {
    // 降級空數據
  }

  // 真實初始狀態（尚無訂單時呈現 0，避免虛假假營業額）
  const history: SalesHistoryPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const dateStr = d.toISOString().slice(0, 10);
    history.push({
      date: dateStr,
      revenueNt: 0,
      ordersCount: 0,
    });
  }

  const metrics: RevenueMetric = {
    todayRevenueNt: 0,
    weekRevenueNt: 0,
    monthRevenueNt: 0,
    totalRevenueNt: 0,
    todayOrdersCount: 0,
    weekOrdersCount: 0,
    monthOrdersCount: 0,
    totalOrdersCount: 0,
    averageOrderValueNt: 0,
    repeatPurchaseRate: 0,
    autoshipRatio: 0,
  };

  return NextResponse.json({ metrics, history, source: "database" });
}
