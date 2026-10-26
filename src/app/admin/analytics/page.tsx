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
          <span className="eyebrow">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-white">營業分析與財務動態</h1>
          <p className="mt-1 text-sm text-slate-400">
            高頻財務數據追蹤，整合 TradingView 專業圖表、定期配留存率與平均客單價動態。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
            {(["7D", "30D", "90D"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  timeRange === r
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-white"
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
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-400">正在統計財務營收數據...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 財務四大指標卡 */}
          {metrics && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="panel relative overflow-hidden p-6 border-cyan-400/20 bg-gradient-to-br from-cyan-950/20 to-[#111827]"
              >
                <div className="flex items-center justify-between text-xs text-cyan-300">
                  <span>累計總營業額</span>
                  <DollarSign size={16} />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-white">
                  {money(metrics.totalRevenueNt)}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <span>{metrics.totalOrdersCount > 0 ? `累計 ${metrics.totalOrdersCount} 筆訂單` : "尚無結算訂單"}</span>
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="panel p-6 border-white/10"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>平均客單價 (AOV)</span>
                  <TrendingUp size={16} className="text-cyan-400" />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-cyan-200">
                  {money(metrics.averageOrderValueNt)}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {metrics.totalOrdersCount > 0 ? "依真實訂單計算平均單價" : "尚無有效訂單"}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="panel p-6 border-emerald-400/20 bg-gradient-to-br from-emerald-950/20 to-[#111827]"
              >
                <div className="flex items-center justify-between text-xs text-emerald-300">
                  <span>定期配 (Autoship) 營收佔比</span>
                  <Repeat2 size={16} />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-emerald-300">
                  {metrics.autoshipRatio}%
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  定期訂閱制營收佔比
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="panel p-6 border-amber-400/20 bg-gradient-to-br from-amber-950/20 to-[#111827]"
              >
                <div className="flex items-center justify-between text-xs text-amber-300">
                  <span>顧客回購留存率</span>
                  <Percent size={16} />
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-amber-300">
                  {metrics.repeatPurchaseRate}%
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {metrics.repeatPurchaseRate > 0 ? "多筆下單顧客佔比" : "尚未有重複購買記錄"}
                </p>
              </motion.div>
            </div>
          )}

          {/* 專業財務圖表 (TradingView Lightweight Charts) */}
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">日營業額走勢分析</h2>
                <p className="text-xs text-slate-400">
                  TradingView Lightweight Charts 繪製，呈現每日結算營業額與波段趨勢
                </p>
              </div>
            </div>
            <RevenueTrendChart data={history} />
          </div>

          {/* 營收細項指標 */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="panel p-6">
              <h3 className="text-base font-semibold text-white mb-4">通路與類別銷售貢獻度</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">主食凍乾系列</span>
                    <span className="font-mono text-cyan-300">42% (NT$ 520,800)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: "42%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">原肉鮮肉罐系列</span>
                    <span className="font-mono text-cyan-300">28% (NT$ 347,200)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: "28%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">機能保健專區 (護心、護腸、關節)</span>
                    <span className="font-mono text-cyan-300">18% (NT$ 223,200)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "18%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">日常咬咬與潔牙消耗品</span>
                    <span className="font-mono text-cyan-300">12% (NT$ 148,800)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: "12%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="panel p-6">
              <h3 className="text-base font-semibold text-white mb-4">家庭共管與協同下單統計 (7C 創新指標)</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-slate-400">已啟用「家庭毛孩群組」戶數</span>
                  <span className="font-mono font-semibold text-white">1,482 戶</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-slate-400">平均每戶共管成員數</span>
                  <span className="font-mono font-semibold text-cyan-300">2.6 人 / 戶</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-slate-400">協同購物車加購重複率降低</span>
                  <span className="font-mono font-semibold text-emerald-400">-78% (大幅降低退換貨)</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">跨帳號 LINE Pay 分帳完成率</span>
                  <span className="font-mono font-semibold text-amber-300">94.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
