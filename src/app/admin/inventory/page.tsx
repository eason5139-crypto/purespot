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
          <span className="eyebrow text-[#935941]">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-[#302b26]">庫存警報</h1>
          <p className="mt-1 text-sm text-[#675e53]">
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
        <div className="panel p-5 bg-white border border-rose-200 shadow-sm">
          <XCircle size={20} className="text-rose-600 mb-3" />
          <p className="text-xs text-rose-700 font-medium">嚴重缺貨（≤ {CRITICAL_THRESHOLD} 包）</p>
          <p className="mt-1 text-3xl font-mono font-bold text-rose-700">{criticalCount}</p>
        </div>
        <div className="panel p-5 bg-white border border-[#e2a84c]/30 shadow-sm">
          <AlertTriangle size={20} className="text-[#8a5a14] mb-3" />
          <p className="text-xs text-[#8a5a14] font-medium">庫存偏低（≤ {LOW_STOCK_THRESHOLD} 包）</p>
          <p className="mt-1 text-3xl font-mono font-bold text-[#8a5a14]">{lowCount}</p>
        </div>
        <div className="panel p-5 bg-white border border-[#68856b]/30 shadow-sm">
          <CheckCircle2 size={20} className="text-[#425847] mb-3" />
          <p className="text-xs text-[#425847] font-medium">庫存充足</p>
          <p className="mt-1 text-3xl font-mono font-bold text-[#425847]">{okCount}</p>
        </div>
      </div>

      {/* 警示條 */}
      {criticalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700"
        >
          <AlertTriangle size={16} />
          有 <strong>{criticalCount}</strong> 款商品庫存嚴重不足，建議立即補貨以免影響出貨。
        </motion.div>
      )}

      {/* 商品庫存表 */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#e8ded3] bg-[#fcfaf7] text-xs font-semibold text-[#675e53]">
            <tr>
              <th className="p-4">商品</th>
              <th className="p-4">物種</th>
              <th className="p-4 text-center">現有庫存</th>
              <th className="p-4 text-center">狀態</th>
              <th className="p-4 text-right">售價</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8ded3]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#8a7f75]">
                  <div className="mx-auto size-6 animate-spin rounded-full border-2 border-[#935941] border-t-transparent mb-2" />
                  同步最新商品庫存中...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#8a7f75]">
                  資料庫目前尚無在架商品
                </td>
              </tr>
            ) : (
              sorted.map((p) => {
                const isCritical = p.stock <= CRITICAL_THRESHOLD;
                const isLow = !isCritical && p.stock <= LOW_STOCK_THRESHOLD;

                return (
                  <tr key={p.id} className="hover:bg-[#fbf8f4] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#ebe5da]">
                          <Image src={p.image} alt={p.name} fill sizes="48px" className="object-contain p-1" />
                        </div>
                        <div>
                          <p className="font-medium text-[#302b26]">{p.name}</p>
                          <p className="text-xs text-[#8a7f75]">{p.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.type === "CAT"
                            ? "bg-[#935941]/10 text-[#935941]"
                            : "bg-[#fdf6ea] text-[#8a5a14] border border-[#e2a84c]/20"
                        }`}
                      >
                        {petLabels[p.type]}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-base">
                      <span
                        className={
                          isCritical
                            ? "text-rose-600"
                            : isLow
                              ? "text-[#8a5a14]"
                              : "text-[#425847]"
                        }
                      >
                        {p.stock}
                      </span>
                      <span className="text-xs text-[#8a7f75] font-normal ml-1">包</span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                          isCritical
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : isLow
                              ? "border-[#e2a84c]/30 bg-[#fdf6ea] text-[#8a5a14]"
                              : "border-[#68856b]/30 bg-[#eef0e8] text-[#425847]"
                        }`}
                      >
                        {isCritical ? "嚴重缺貨" : isLow ? "庫存偏低" : "正常供應"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-semibold text-[#935941]">
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
