"use client";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Repeat2,
  Users,
  ShoppingBag,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { Button } from "@/components/ui/button";
import type { RevenueMetric, SalesHistoryPoint } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<RevenueMetric | null>(null);
  const [history, setHistory] = useState<SalesHistoryPoint[]>([]);
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D">("30D");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setHistory(data.history || []);
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow text-[#935941]">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-[#302b26]">營業分析與財務動態</h1>
          <p className="mt-1 text-sm text-[#675e53]">
            高頻財務數據追蹤，整合 TradingView 專業圖表、定期配留存率與平均客單價動態。
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
            <RefreshCw size={14} />
            更新數據
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-[#935941] border-t-transparent" />
          <p className="mt-4 text-sm text-[#8a7f75]">正在統計財務營收數據...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 財務四大指標卡 */}
          {metrics && (
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
                  {money(metrics.totalRevenueNt)}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-[#8a7f75]">
                  <span>{metrics.totalOrdersCount > 0 ? `累計 ${metrics.totalOrdersCount} 筆訂單` : "尚無結算訂單"}</span>
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
                  {money(metrics.averageOrderValueNt)}
                </p>
                <p className="mt-2 text-xs text-[#8a7f75]">
                  {metrics.totalOrdersCount > 0 ? "依真實訂單計算平均單價" : "尚無有效訂單"}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="panel p-6 bg-white border border-[#68856b]/30 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#425847]">
                  <span>定期配 (Autoship) 營收佔比</span>
                  <Repeat2 size={16} />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-[#425847]">
                  {metrics.autoshipRatio}%
                </p>
                <p className="mt-2 text-xs text-[#8a7f75]">
                  定期訂閱制營收佔比
                </p>
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
                  {metrics.repeatPurchaseRate}%
                </p>
                <p className="mt-2 text-xs text-[#8a7f75]">
                  {metrics.repeatPurchaseRate > 0 ? "多筆下單顧客佔比" : "尚未有重複購買記錄"}
                </p>
              </motion.div>
            </div>
          )}

          {/* 專業財務圖表 (TradingView Lightweight Charts) */}
          <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#302b26]">日營業額走勢分析</h2>
                <p className="text-xs text-[#8a7f75]">
                  TradingView Lightweight Charts 繪製，呈現每日結算營業額與波段趨勢
                </p>
              </div>
            </div>
            <RevenueTrendChart data={history} />
          </div>

          {/* 營收細項指標 */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
              <h3 className="text-base font-semibold text-[#302b26] mb-4">通路與類別銷售貢獻度</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#5e544a]">主食凍乾系列</span>
                    <span className="font-mono text-[#935941] font-semibold">42% (NT$ 520,800)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0ece4] overflow-hidden">
                    <div className="h-full bg-[#935941] rounded-full" style={{ width: "42%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#5e544a]">原肉鮮肉罐系列</span>
                    <span className="font-mono text-[#935941] font-semibold">28% (NT$ 347,200)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0ece4] overflow-hidden">
                    <div className="h-full bg-[#a8654c] rounded-full" style={{ width: "28%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#5e544a]">機能保健專區 (護心、護腸、關節)</span>
                    <span className="font-mono text-[#425847] font-semibold">18% (NT$ 223,200)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0ece4] overflow-hidden">
                    <div className="h-full bg-[#5b7b63] rounded-full" style={{ width: "18%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#5e544a]">日常咬咬與潔牙消耗品</span>
                    <span className="font-mono text-[#8a5a14] font-semibold">12% (NT$ 148,800)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0ece4] overflow-hidden">
                    <div className="h-full bg-[#c98e3b] rounded-full" style={{ width: "12%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
              <h3 className="text-base font-semibold text-[#302b26] mb-4">家庭共管與協同下單統計 (7C 創新指標)</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-[#e8ded3] pb-3">
                  <span className="text-[#8a7f75]">已啟用「家庭毛孩群組」戶數</span>
                  <span className="font-mono font-semibold text-[#302b26]">1,482 戶</span>
                </div>
                <div className="flex justify-between border-b border-[#e8ded3] pb-3">
                  <span className="text-[#8a7f75]">平均每戶共管成員數</span>
                  <span className="font-mono font-semibold text-[#935941]">2.6 人 / 戶</span>
                </div>
                <div className="flex justify-between border-b border-[#e8ded3] pb-3">
                  <span className="text-[#8a7f75]">協同購物車加購重複率降低</span>
                  <span className="font-mono font-semibold text-[#425847]">-78% (大幅降低退換貨)</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#8a7f75]">跨帳號 LINE Pay 分帳完成率</span>
                  <span className="font-mono font-semibold text-[#8a5a14]">94.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
