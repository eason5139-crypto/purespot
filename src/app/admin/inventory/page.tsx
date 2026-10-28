"use client";
import { useState, useEffect } from "react";
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
import { petLabels, type PetType } from "@/lib/types";

const LOW_STOCK_THRESHOLD = 20;
const CRITICAL_THRESHOLD = 10;

interface InventoryProduct {
  id: string;
  name: string;
  subtitle: string;
  type: PetType;
  category: string;
  priceNt: number;
  stock: number;
  image: string;
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // 容錯
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const sorted = [...products].sort((a, b) => a.stock - b.stock);
  const criticalCount = sorted.filter((p) => p.stock <= CRITICAL_THRESHOLD).length;
  const lowCount = sorted.filter(
    (p) => p.stock > CRITICAL_THRESHOLD && p.stock <= LOW_STOCK_THRESHOLD
  ).length;
  const okCount = sorted.filter((p) => p.stock > LOW_STOCK_THRESHOLD).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-white">庫存警報</h1>
          <p className="mt-1 text-sm text-slate-400">
            即時監控真實資料庫在架商品庫存量，低於警戒值時自動標示警示。
          </p>
        </div>
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => void fetchProducts()}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          重新整理庫存
        </Button>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <div className="mx-auto size-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mb-2" />
                  同步最新商品庫存中...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  資料庫目前尚無在架商品
                </td>
              </tr>
            ) : (
              sorted.map((p) => {
                const isCritical = p.stock <= CRITICAL_THRESHOLD;
                const isLow = !isCritical && p.stock <= LOW_STOCK_THRESHOLD;

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                          <Image src={p.image} alt={p.name} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.type === "CAT"
                            ? "bg-cyan-400/10 text-cyan-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {petLabels[p.type]}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-base">
                      <span
                        className={
                          isCritical
                            ? "text-rose-400"
                            : isLow
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }
                      >
                        {p.stock}
                      </span>
                      <span className="text-xs text-slate-500 font-normal ml-1">包</span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                          isCritical
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                            : isLow
                              ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {isCritical ? "嚴重缺貨" : isLow ? "庫存偏低" : "正常供應"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-cyan-300">
                      {money(p.priceNt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
