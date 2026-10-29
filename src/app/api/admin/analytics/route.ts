import { NextResponse } from "next/server";
import { db } from "@/server/db";
import type {
  RevenueMetric,
  SalesHistoryPoint,
  PaymentBreakdown,
  CategoryBreakdown,
  PetTypeBreakdown,
  ABCProductData,
  RepeatPurchaseDetail,
} from "@/lib/adminTypes";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError } from "@/server/http";

export const runtime = "nodejs";

const PET_LABELS: Record<string, string> = {
  CAT: "貓咪",
  DOG: "狗狗",
  HAMSTER: "倉鼠",
  RABBIT: "兔兔",
};

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
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    // 一次取得所有訂單（含 items、user、variant->product）
    const allOrders = await db.order.findMany({
      select: {
        id: true,
        totalNt: true,
        createdAt: true,
        status: true,
        userId: true,
        items: {
          select: {
            variantId: true,
            productName: true,
            quantity: true,
            unitPriceNt: true,
            isAutoship: true,
            variant: {
              select: {
                productId: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    targetPetType: true,
                    category: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (allOrders.length === 0) {
      // 空資料庫：回傳全零但真實結構
      const emptyHistory: SalesHistoryPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86_400_000);
        emptyHistory.push({ date: d.toISOString().slice(0, 10), revenueNt: 0, ordersCount: 0 });
      }
      const emptyMetrics: RevenueMetric = {
        todayRevenueNt: 0, weekRevenueNt: 0, monthRevenueNt: 0, totalRevenueNt: 0,
        todayOrdersCount: 0, weekOrdersCount: 0, monthOrdersCount: 0, totalOrdersCount: 0,
        averageOrderValueNt: 0, repeatPurchaseRate: 0, autoshipRatio: 0,
      };
      return NextResponse.json({
        metrics: emptyMetrics,
        history: emptyHistory,
        paymentBreakdown: [] as PaymentBreakdown[],
        categoryBreakdown: [] as CategoryBreakdown[],
        petTypeBreakdown: [] as PetTypeBreakdown[],
        abcProducts: [] as ABCProductData[],
        repeatDetail: { totalBuyers: 0, repeatBuyers: 0, rate: 0, avgOrdersPerRepeatBuyer: 0, avgDaysBetweenOrders: 0 } as RepeatPurchaseDetail,
        source: "database",
      });
    }

    // ── 基礎指標計算 ─────────────────────────────────────
    let todayRev = 0, todayCount = 0;
    let weekRev = 0, weekCount = 0;
    let monthRev = 0, monthCount = 0;
    let totalRev = 0;
    let autoshipRev = 0;

    const dateMap = new Map<string, { revenue: number; count: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      dateMap.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
    }

    // 付款方式（Order 沒有 paymentMethod 欄位，用 paymentReference 前綴推算）
    const paymentMap = new Map<string, { count: number; amount: number }>();

    // 品類統計
    const categoryMap = new Map<string, number>();

    // 寵物類型統計
    const petTypeCountMap = new Map<string, { count: number; amount: number }>();

    // ABC 商品統計
    const abcMap = new Map<string, { name: string; salesQty: number; revenue: number; qtyRecent: number; qtyPrior: number }>();

    // 回購率計算
    const userOrderMap = new Map<string, { dates: Date[]; totalAmount: number }>();

    for (const o of allOrders) {
      const oTime = new Date(o.createdAt).getTime();
      const dateKey = new Date(o.createdAt).toISOString().slice(0, 10);
      const oDate = new Date(o.createdAt);
      totalRev += o.totalNt;

      if (oTime >= startOfToday.getTime()) { todayRev += o.totalNt; todayCount++; }
      if (oTime >= startOfWeek.getTime()) { weekRev += o.totalNt; weekCount++; }
      if (oTime >= startOfMonth.getTime()) { monthRev += o.totalNt; monthCount++; }

      if (dateMap.has(dateKey)) {
        const cur = dateMap.get(dateKey)!;
        cur.revenue += o.totalNt;
        cur.count += 1;
      }

      // 付款方式推算（依 paymentReference 前綴或 status）
      let payMethod = "其他方式";
      // 根據訂單狀態分類（PURESPOT 目前無 paymentMethod 欄位）
      if (o.status === "PAID" || o.status === "PROCESSING" || o.status === "DISPATCHED" || o.status === "COMPLETED") {
        payMethod = "線上付款";
      } else if (o.status === "PENDING_PAYMENT") {
        payMethod = "待付款";
      } else if (o.status === "CANCELLED") {
        payMethod = "已取消";
      }
      const pm = paymentMap.get(payMethod) ?? { count: 0, amount: 0 };
      pm.count += 1;
      pm.amount += o.totalNt;
      paymentMap.set(payMethod, pm);

      // 回購率
      const uo = userOrderMap.get(o.userId) ?? { dates: [], totalAmount: 0 };
      uo.dates.push(oDate);
      uo.totalAmount += o.totalNt;
      userOrderMap.set(o.userId, uo);

      // 品類 + 寵物類型 + ABC
      let hasAutoship = false;
      for (const item of o.items) {
        if (item.isAutoship) hasAutoship = true;
        const itemRev = item.unitPriceNt * item.quantity;
        const prod = item.variant?.product;
        const catName = prod?.category?.name ?? "其他";
        categoryMap.set(catName, (categoryMap.get(catName) ?? 0) + itemRev);

        const petType = prod?.targetPetType ?? "OTHER";
        const pt = petTypeCountMap.get(petType) ?? { count: 0, amount: 0 };
        pt.count += 1;
        pt.amount += itemRev;
        petTypeCountMap.set(petType, pt);

        // ABC 統計（用 productId 作為 key）
        const productId = prod?.id ?? item.productName;
        const productName = prod?.name ?? item.productName;
        const prev = abcMap.get(productId) ?? { name: productName, salesQty: 0, revenue: 0, qtyRecent: 0, qtyPrior: 0 };
        prev.salesQty += item.quantity;
        prev.revenue += itemRev;
        if (oDate >= sevenDaysAgo) prev.qtyRecent += item.quantity;
        else if (oDate >= fourteenDaysAgo) prev.qtyPrior += item.quantity;
        abcMap.set(productId, prev);
      }
      if (hasAutoship) autoshipRev += o.totalNt;
    }

    // ── 回購率計算 ───────────────────────────────────────
    const totalBuyers = userOrderMap.size;
    let repeatBuyers = 0;
    let totalRepeatOrders = 0;
    let totalDaysBetween = 0;
    let daysBetweenCount = 0;

    for (const [, uo] of userOrderMap) {
      if (uo.dates.length > 1) {
        repeatBuyers++;
        totalRepeatOrders += uo.dates.length;
        const sorted = uo.dates.sort((a, b) => a.getTime() - b.getTime());
        for (let i = 1; i < sorted.length; i++) {
          const curr = sorted[i];
          const prev = sorted[i - 1];
          if (curr && prev) {
            totalDaysBetween += (curr.getTime() - prev.getTime()) / 86_400_000;
            daysBetweenCount++;
          }
        }
      }
    }

    const repeatDetail: RepeatPurchaseDetail = {
      totalBuyers,
      repeatBuyers,
      rate: totalBuyers > 0 ? Math.round((repeatBuyers / totalBuyers) * 100) : 0,
      avgOrdersPerRepeatBuyer: repeatBuyers > 0 ? Math.round((totalRepeatOrders / repeatBuyers) * 10) / 10 : 0,
      avgDaysBetweenOrders: daysBetweenCount > 0 ? Math.round(totalDaysBetween / daysBetweenCount) : 0,
    };

    // ── 付款方式比例 ──────────────────────────────────────
    const payTotalAmount = Array.from(paymentMap.values()).reduce((s, v) => s + v.amount, 0);
    const paymentBreakdown: PaymentBreakdown[] = Array.from(paymentMap.entries())
      .map(([method, v]) => ({
        method,
        count: v.count,
        amountNt: v.amount,
        pct: payTotalAmount > 0 ? Math.round((v.amount / payTotalAmount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amountNt - a.amountNt);

    // ── 品類銷售貢獻 ──────────────────────────────────────
    const catTotal = Array.from(categoryMap.values()).reduce((s, v) => s + v, 0);
    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([category, amountNt]) => ({
        category,
        amountNt,
        pct: catTotal > 0 ? Math.round((amountNt / catTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amountNt - a.amountNt);

    // ── 寵物類型分佈 ──────────────────────────────────────
    const ptTotal = Array.from(petTypeCountMap.values()).reduce((s, v) => s + v.amount, 0);
    const petTypeBreakdown: PetTypeBreakdown[] = Array.from(petTypeCountMap.entries())
      .map(([type, v]) => ({
        type,
        label: PET_LABELS[type] ?? type,
        count: v.count,
        amountNt: v.amount,
        pct: ptTotal > 0 ? Math.round((v.amount / ptTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amountNt - a.amountNt);

    // ── ABC 商品資料 ──────────────────────────────────────
    const abcProducts: ABCProductData[] = Array.from(abcMap.entries())
      .map(([productId, d]) => ({ productId, ...d }))
      .filter(p => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // ── history ───────────────────────────────────────────
    const history: SalesHistoryPoint[] = Array.from(dateMap.entries()).map(([date, val]) => ({
      date,
      revenueNt: val.revenue,
      ordersCount: val.count,
    }));

    const metrics: RevenueMetric = {
      todayRevenueNt: todayRev,
      weekRevenueNt: weekRev,
      monthRevenueNt: monthRev,
      totalRevenueNt: totalRev,
      todayOrdersCount: todayCount,
      weekOrdersCount: weekCount,
      monthOrdersCount: monthCount,
      totalOrdersCount: allOrders.length,
      averageOrderValueNt: allOrders.length > 0 ? Math.round(totalRev / allOrders.length) : 0,
      repeatPurchaseRate: repeatDetail.rate,
      autoshipRatio: totalRev > 0 ? Math.round((autoshipRev / totalRev) * 1000) / 10 : 0,
    };

    return NextResponse.json({
      metrics,
      history,
      paymentBreakdown,
      categoryBreakdown,
      petTypeBreakdown,
      abcProducts,
      repeatDetail,
      source: "database",
    });
  } catch (error) {
    return apiError(error);
  }
}
