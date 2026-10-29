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
}

// 進度條元件
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
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#5e544a]">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>
          {pct.toFixed(1)}%{amount > 0 ? ` (NT$ ${amount.toLocaleString()})` : ""}
          {count !== undefined ? ` · ${count} 筆` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#f0ece4] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// 配色輪換（大地色系）
const PALETTE = ["#935941", "#5b7b63", "#c98e3b", "#8a7f75", "#a8654c", "#425847"];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D">("30D");
  const [activeTab, setActiveTab] = useState<"overview" | "abc">("overview");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const json = await res.json();
        setData({
          metrics: json.metrics,
          history: json.history || [],
          paymentBreakdown: json.paymentBreakdown || [],
          categoryBreakdown: json.categoryBreakdown || [],
          petTypeBreakdown: json.petTypeBreakdown || [],
          abcProducts: json.abcProducts || [],
          repeatDetail: json.repeatDetail ?? {
            totalBuyers: 0,
            repeatBuyers: 0,
            rate: 0,
            avgOrdersPerRepeatBuyer: 0,
            avgDaysBetweenOrders: 0,
          },
        });
      }
    } catch {
      // 容錯
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // 依選取時距過濾 history
  const filteredHistory = (() => {
    if (!data) return [];
    const days = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    return data.history.slice(-days);
  })();

  const m = data?.metrics;

  return (
    <div>
      {/* 頁首 */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow text-[#935941]">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-[#302b26]">營業分析與財務動態</h1>
          <p className="mt-1 text-sm text-[#675e53]">
            真實數據驅動——品類貢獻、付款比例、回購週期與商品 ABC 結構全覽。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-[#e8ded3] bg-white p-1 shadow-sm">
            {(["7D", "30D", "90D"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  timeRange === r
                    ? "bg-[#935941] text-white font-semibold shadow-sm"
                    : "text-[#675e53] hover:text-[#302b26]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => void fetchData()}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            更新數據
          </Button>
        </div>
      </div>

      {/* 頁籤切換 */}
      <div className="flex gap-1 mb-6 bg-[#f8f5ef] rounded-xl p-1 w-fit border border-[#e8ded3]">
        {([
          { key: "overview", label: "總覽指標" },
          { key: "abc", label: "商品 ABC 分析" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-[#302b26] shadow-sm border border-[#e8ded3]"
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
          <p className="mt-4 text-sm text-[#8a7f75]">正在統計財務與商品結構數據...</p>
        </div>
      ) : activeTab === "overview" ? (
        <div className="space-y-8">
          {/* 四大指標卡 */}
          {m && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="panel relative overflow-hidden p-6 bg-white border border-[#e8ded3] shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#935941]">
                  <span>累計總營業額</span>
                  <DollarSign size={16} />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-[#302b26]">
                  {money(m.totalRevenueNt)}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-[#8a7f75]">
                  {m.totalOrdersCount > 0
                    ? `累計 ${m.totalOrdersCount} 筆訂單`
                    : "尚無結算訂單"}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="panel p-6 bg-white border border-[#e8ded3] shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#675e53]">
                  <span>平均客單價 (AOV)</span>
                  <TrendingUp size={16} className="text-[#935941]" />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-[#935941]">
                  {money(m.averageOrderValueNt)}
                </p>
                <p className="mt-2 text-xs text-[#8a7f75]">
                  {m.totalOrdersCount > 0 ? "依真實訂單計算平均單價" : "尚無有效訂單"}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="panel p-6 bg-white border border-[#68856b]/30 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#425847]">
                  <span>定期配 (Autoship) 佔比</span>
                  <Repeat2 size={16} />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-[#425847]">
                  {m.autoshipRatio}%
                </p>
                <p className="mt-2 text-xs text-[#8a7f75]">定期訂閱制營收佔比</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="panel p-6 bg-white border border-[#e2a84c]/30 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#8a5a14]">
                  <span>顧客回購留存率</span>
                  <Percent size={16} />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-[#8a5a14]">
                  {m.repeatPurchaseRate}%
                </p>
                <p className="mt-2 text-xs text-[#8a7f75]">
                  {m.repeatPurchaseRate > 0 ? "多筆下單顧客佔比" : "尚未有重複購買記錄"}
                </p>
              </motion.div>
            </div>
          )}

          {/* 走勢圖 */}
          <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#302b26]">日營業額走勢分析</h2>
                <p className="text-xs text-[#8a7f75]">
                  TradingView Lightweight Charts 繪製，呈現每日結算營業額與波段趨勢
                </p>
              </div>
            </div>
            <RevenueTrendChart data={filteredHistory} />
          </div>

          {/* 回購率詳細指標 */}
          {data?.repeatDetail && data.repeatDetail.totalBuyers > 0 && (
            <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-[#935941]" />
                <h3 className="text-base font-semibold text-[#302b26]">回購率詳細指標</h3>
                <span className="text-xs text-[#8a7f75]">— 依真實訂單統計</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "有購買記錄會員數",
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
                    color: "#5b7b63",
                  },
                  {
                    label: "平均回購間隔",
                    value:
                      data.repeatDetail.avgDaysBetweenOrders > 0
                        ? `${data.repeatDetail.avgDaysBetweenOrders} 天`
                        : "—",
                    color: "#8a5a14",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#e8ded3] p-4 bg-[#fdfcfa]"
                  >
                    <p className="text-xs text-[#8a7f75] mb-1">{item.label}</p>
                    <p
                      className="text-2xl font-bold font-mono"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 品類 + 付款方式 */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 品類銷售貢獻 */}
            <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-[#935941]" />
                <h3 className="text-base font-semibold text-[#302b26]">品類銷售貢獻</h3>
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
                <p className="text-sm text-[#8a7f75] py-4 text-center">
                  尚無品類銷售資料
                </p>
              )}
            </div>

            {/* 付款方式比例 */}
            <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={16} className="text-[#5b7b63]" />
                <h3 className="text-base font-semibold text-[#302b26]">付款方式比例</h3>
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
                <p className="text-sm text-[#8a7f75] py-4 text-center">
                  尚無付款記錄資料
                </p>
              )}
            </div>
          </div>

          {/* 寵物類型分佈 */}
          {data?.petTypeBreakdown && data.petTypeBreakdown.length > 0 && (
            <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <PawPrint size={16} className="text-[#935941]" />
                <h3 className="text-base font-semibold text-[#302b26]">寵物類型銷售分佈</h3>
                <span className="text-xs text-[#8a7f75]">— 依訂單品項歸屬統計</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.petTypeBreakdown.map((pt, i) => (
                  <div
                    key={pt.type}
                    className="rounded-xl border border-[#e8ded3] p-4 bg-[#fdfcfa]"
                  >
                    <p className="text-xs text-[#8a7f75] mb-1">{pt.label}</p>
                    <p
                      className="text-2xl font-bold font-mono"
                      style={{ color: PALETTE[i % PALETTE.length]! }}
                    >
                      {pt.pct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[#8a7f75] mt-1">
                      NT$ {pt.amountNt.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ABC 分析頁籤 */
        <div className="space-y-4">
          <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#302b26]">商品 ABC 矩陣分析</h2>
              <p className="text-xs text-[#8a7f75] mt-1">
                依累積營收佔比分類：A 類（前 70%）、B 類（70–90%）、C 類（其餘）
              </p>
            </div>
            <ProductABCChart rawData={data?.abcProducts ?? []} />
          </div>
        </div>
      )}
    </div>
  );
}
