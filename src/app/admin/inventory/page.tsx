"use client";
import { useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Package,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { products } from "@/lib/catalog";

const LOW_STOCK_THRESHOLD = 20;
const CRITICAL_THRESHOLD = 10;

export default function AdminInventoryPage() {
  const [stocks, setStocks] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.id, p.stock]))
  );

  function restock(id: string) {
    setStocks((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 50 }));
  }

  const sorted = [...products].sort((a, b) => (stocks[a.id] ?? 0) - (stocks[b.id] ?? 0));
  const criticalCount = sorted.filter((p) => (stocks[p.id] ?? 0) <= CRITICAL_THRESHOLD).length;
  const lowCount = sorted.filter(
    (p) => (stocks[p.id] ?? 0) > CRITICAL_THRESHOLD && (stocks[p.id] ?? 0) <= LOW_STOCK_THRESHOLD
  ).length;
  const okCount = sorted.filter((p) => (stocks[p.id] ?? 0) > LOW_STOCK_THRESHOLD).length;

  return (
    <div>
      <div className="mb-8">
        <span className="eyebrow">管理端</span>
        <h1 className="mt-2 text-2xl font-bold text-white">庫存警報</h1>
        <p className="mt-1 text-sm text-slate-400">
          即時監控所有商品庫存量，低於警戒值時自動標示警示。
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="panel p-5 border-rose-400/20 bg-rose-950/10">
          <XCircle size={20} className="text-rose-400 mb-3" />
          <p className="text-xs text-rose-300">嚴重缺貨（≤ {CRITICAL_THRESHOLD} 包）</p>
          <p className="mt-1 text-3xl font-mono font-bold text-rose-300">{criticalCount}</p>
        </div>
        <div className="panel p-5 border-amber-400/20 bg-amber-950/10">
          <AlertTriangle size={20} className="text-amber-400 mb-3" />
          <p className="text-xs text-amber-300">庫存偏低（≤ {LOW_STOCK_THRESHOLD} 包）</p>
          <p className="mt-1 text-3xl font-mono font-bold text-amber-300">{lowCount}</p>
        </div>
        <div className="panel p-5 border-emerald-400/20 bg-emerald-950/10">
          <CheckCircle2 size={20} className="text-emerald-400 mb-3" />
          <p className="text-xs text-emerald-300">庫存充足</p>
          <p className="mt-1 text-3xl font-mono font-bold text-emerald-300">{okCount}</p>
        </div>
      </div>

      {/* 警示條 */}
      {criticalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-300"
        >
          <AlertTriangle size={16} />
          有 <strong>{criticalCount}</strong> 款商品庫存嚴重不足，建議立即補貨以免影響出貨。
        </motion.div>
      )}

      {/* 商品庫存表 */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
            <tr>
              <th className="p-4">商品</th>
              <th className="p-4">物種</th>
              <th className="p-4 text-center">現有庫存</th>
              <th className="p-4 text-center">狀態</th>
              <th className="p-4 text-right">售價</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((p, i) => {
              const stock = stocks[p.id] ?? 0;
              const isCritical = stock <= CRITICAL_THRESHOLD;
              const isLow = !isCritical && stock <= LOW_STOCK_THRESHOLD;

              return (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`transition-colors hover:bg-white/[0.02] ${isCritical ? "bg-rose-950/10" : isLow ? "bg-amber-950/5" : ""}`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-black/40">
                        <Image src={p.image} alt={p.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.bagGrams}g</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                      {p.type === "CAT" ? "🐱 貓" : "🐶 狗"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-mono text-lg font-bold ${
                        isCritical ? "text-rose-400" : isLow ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {stock}
                      </span>
                      {/* 庫存條 */}
                      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCritical ? "bg-rose-400" : isLow ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min((stock / 100) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {isCritical ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-0.5 text-xs text-rose-400">
                        <XCircle size={11} />
                        嚴重缺貨
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-400">
                        <TrendingDown size={11} />
                        庫存偏低
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-400">
                        <CheckCircle2 size={11} />
                        庫存充足
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-300">{money(p.priceNt)}</td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      variant={isCritical ? "default" : "ghost"}
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => restock(p.id)}
                    >
                      <Plus size={12} />
                      補貨 +50
                    </Button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
