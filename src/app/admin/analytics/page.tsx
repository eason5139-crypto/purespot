"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Repeat2,
  Percent,
  RefreshCw,
  Users,
  CreditCard,
  BarChart2,
  PawPrint,
} from "lucide-react";
import { motion } from "framer-motion";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { ProductABCChart } from "@/components/admin/ProductABCChart";
import { Button } from "@/components/ui/button";
import type {
  RevenueMetric,
  SalesHistoryPoint,
  PaymentBreakdown,
  CategoryBreakdown,
  PetTypeBreakdown,
  ABCProductData,
  RepeatPurchaseDetail,
} from "@/lib/adminTypes";
import { money } from "@/lib/utils";

interface AnalyticsData {
  metrics: RevenueMetric;
  history: SalesHistoryPoint[];
  paymentBreakdown: PaymentBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  petTypeBreakdown: PetTypeBreakdown[];
  abcProducts: ABCProductData[];
  repeatDetail: RepeatPurchaseDetail;
  inventorySpending: { procurementNt: number; lossNt: number; totalNt: number };
}

function BarRow({
  label,
  pct,
  amount,
  color,
  count,
}: {
  label: string;
  pct: number;
  amount: number;
  color: string;
  count?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-[#5e544a]">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>
          {pct.toFixed(1)}%
          {amount > 0 ? ` (NT$ ${amount.toLocaleString()})` : ""}
          {count !== undefined ? ` · ${count} 筆` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#f0ece4]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

const PALETTE = [
  "#935941",
  "#4e6752",
  "#b8823c",
  "#8a7a6a",
  "#a8654c",
  "#6b7c6e",
];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D">("30D");
  const [abcDays, setAbcDays] = useState<7 | 30 | 90>(30);
  const [activeTab, setActiveTab] = useState<"overview" | "abc">("overview");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError("");
      const res = await fetch(`/api/admin/analytics?abcDays=${abcDays}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setData({
          metrics: json.metrics,
          history: json.history || [],
          paymentBreakdown: json.paymentBreakdown || [],
          categoryBreakdown: json.categoryBreakdown || [],
          petTypeBreakdown: json.petTypeBreakdown || [],
          abcProducts: json.abcProducts || [],
          inventorySpending: json.inventorySpending ?? {
            procurementNt: 0,
            lossNt: 0,
            totalNt: 0,
          },
          repeatDetail: json.repeatDetail ?? {
            totalBuyers: 0,
            repeatBuyers: 0,
            rate: 0,
            avgOrdersPerRepeatBuyer: 0,
            avgDaysBetweenOrders: 0,
          },
        });
      } else {
        throw new Error("分析資料暫時無法載入");
      }
    } catch {
      setFetchError("分析資料暫時無法載入，請重新整理");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [abcDays]);

  const filteredHistory = (() => {
    if (!data) return [];
    const days = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    return data.history.slice(-days);
  })();

  const m = data?.metrics;

  return (
    <div className="mx-auto max-w-7xl">
      {/* 頁首 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#302b26]">數據分析</h1>
        <div className="flex items-center gap-3">
          {activeTab === "overview" && (
            <div className="flex rounded-xl border border-[#e5d8c8] bg-white p-1 shadow-2xs">
              {(["7D", "30D", "90D"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-all ${
                    timeRange === r
                      ? "bg-[#935941] text-white"
                      : "text-[#675e53] hover:text-[#302b26]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => void fetchData()}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            更新
          </Button>
        </div>
      </div>

      {fetchError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {fetchError}
        </p>
      )}

      {/* 頁籤切換 */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-[#e5d8c8] bg-[#f4ece2] p-1">
        {(
          [
            { key: "overview", label: "營運指標" },
            { key: "abc", label: "商品 ABC 分析" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-white text-[#935941] shadow-2xs"
                : "text-[#675e53] hover:text-[#302b26]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-[#935941] border-t-transparent" />
        </div>
      ) : activeTab === "overview" ? (
        <div className="space-y-6">
          {/* 核心營運與成本摘要 */}
          {m && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#7c6d5e]">
                  <span>累計營收</span>
                  <DollarSign size={15} className="text-[#935941]" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-[#302b26]">
                  {money(m.totalRevenueNt)}
                </p>
                <p className="mt-1 text-xs text-[#8a7c6e]">
                  {m.totalOrdersCount} 筆訂單
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#7c6d5e]">
                  <span>平均客單價</span>
                  <TrendingUp size={15} className="text-[#935941]" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-[#935941]">
                  {money(m.averageOrderValueNt)}
                </p>
                <p className="mt-1 text-xs text-[#8a7c6e]">
                  本月毛利率{" "}
                  {m.monthGrossMarginPct == null
                    ? "—"
                    : `${m.monthGrossMarginPct.toFixed(1)}%`}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#7c6d5e]">
                  <span>定期配佔比</span>
                  <Repeat2 size={15} className="text-[#4e6752]" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-[#4e6752]">
                  {m.autoshipRatio}%
                </p>
                <p className="mt-1 text-xs text-[#8a7c6e]">
                  本月進貨 {money(data?.inventorySpending.procurementNt ?? 0)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#7c6d5e]">
                  <span>回購率</span>
                  <Percent size={15} className="text-[#b8823c]" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-[#b8823c]">
                  {m.repeatPurchaseRate}%
                </p>
                <p className="mt-1 text-xs text-[#8a7c6e]">
                  本月耗損 {money(data?.inventorySpending.lossNt ?? 0)}
                </p>
              </motion.div>
            </div>
          )}

          {/* 走勢圖 */}
          <RevenueTrendChart data={filteredHistory} />

          {/* 回購指標 */}
          {data?.repeatDetail && data.repeatDetail.totalBuyers > 0 && (
            <div className="rounded-2xl border border-[#e5d8c8] bg-white p-6 shadow-2xs">
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-[#935941]" />
                <h2 className="text-base font-bold text-[#302b26]">回購指標</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "購買會員數",
                    value: `${data.repeatDetail.totalBuyers.toLocaleString()} 人`,
                    color: "#302b26",
                  },
                  {
                    label: "回購會員數",
                    value: `${data.repeatDetail.repeatBuyers.toLocaleString()} 人`,
                    color: "#935941",
                  },
                  {
                    label: "平均回購次數",
                    value: `${data.repeatDetail.avgOrdersPerRepeatBuyer} 次`,
                    color: "#4e6752",
                  },
                  {
                    label: "平均回購間隔",
                    value:
                      data.repeatDetail.avgDaysBetweenOrders > 0
                        ? `${data.repeatDetail.avgDaysBetweenOrders} 天`
                        : "—",
                    color: "#b8823c",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#ece0d1] bg-[#faf6f0] p-4"
                  >
                    <p className="mb-1 text-xs text-[#7c6d5e]">{item.label}</p>
                    <p
                      className="font-mono text-2xl font-bold"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 品類與付款方式 */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e5d8c8] bg-white p-6 shadow-2xs">
              <div className="mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-[#935941]" />
                <h2 className="text-base font-bold text-[#302b26]">
                  品類銷售占比
                </h2>
              </div>
              {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {data.categoryBreakdown.map((cat, i) => (
                    <BarRow
                      key={cat.category}
                      label={cat.category}
                      pct={cat.pct}
                      amount={cat.amountNt}
                      color={PALETTE[i % PALETTE.length]!}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-[#8a7f75]">
                  尚無資料
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#e5d8c8] bg-white p-6 shadow-2xs">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-[#4e6752]" />
                <h2 className="text-base font-bold text-[#302b26]">
                  付款方式占比
                </h2>
              </div>
              {data?.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {data.paymentBreakdown.map((pay, i) => (
                    <BarRow
                      key={pay.method}
                      label={pay.method}
                      pct={pay.pct}
                      amount={pay.amountNt}
                      count={pay.count}
                      color={PALETTE[i % PALETTE.length]!}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-[#8a7f75]">
                  尚無資料
                </p>
              )}
            </div>
          </div>

          {/* 寵物類型分佈 */}
          {data?.petTypeBreakdown && data.petTypeBreakdown.length > 0 && (
            <div className="rounded-2xl border border-[#e5d8c8] bg-white p-6 shadow-2xs">
              <div className="mb-4 flex items-center gap-2">
                <PawPrint size={16} className="text-[#935941]" />
                <h2 className="text-base font-bold text-[#302b26]">
                  物種銷售分佈
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.petTypeBreakdown.map((pt, i) => (
                  <div
                    key={pt.type}
                    className="rounded-xl border border-[#ece0d1] bg-[#faf6f0] p-4"
                  >
                    <p className="mb-1 text-xs text-[#7c6d5e]">{pt.label}</p>
                    <p
                      className="font-mono text-2xl font-bold"
                      style={{ color: PALETTE[i % PALETTE.length]! }}
                    >
                      {pt.pct.toFixed(1)}%
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#8a7c6e]">
                      NT$ {pt.amountNt.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <ProductABCChart
          rawData={data?.abcProducts ?? []}
          days={abcDays}
          onDaysChange={setAbcDays}
        />
      )}
    </div>
  );
}
