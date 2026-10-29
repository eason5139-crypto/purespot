"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Package,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Minus,
  ClipboardList,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

type AdjustType = "restock" | "adjustment" | "deduction";

interface StockLog {
  id: string;
  productId: string;
  productName: string;
  type: AdjustType;
  delta: number;
  stockBefore: number;
  stockAfter: number;
  note: string;
  createdAt: string;
}

const TYPE_LABEL: Record<AdjustType, string> = {
  restock: "入庫補貨",
  adjustment: "手動校正",
  deduction: "損耗扣除",
};

const TYPE_COLOR: Record<AdjustType, string> = {
  restock: "#5b7b63",
  adjustment: "#935941",
  deduction: "#c0392b",
};

// 調整庫存 Dialog
function AdjustDialog({
  product,
  onClose,
  onSuccess,
}: {
  product: InventoryProduct;
  onClose: () => void;
  onSuccess: (newStock: number, log: StockLog) => void;
}) {
  const [adjustType, setAdjustType] = useState<AdjustType>("restock");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const delta = adjustType === "deduction" ? -Math.abs(qty) : Math.abs(qty);
  const newStock = product.stock + delta;

  const handleSubmit = async () => {
    if (qty <= 0) { setError("數量必須大於 0"); return; }
    if (newStock < 0) { setError("庫存不可低於 0"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${product.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, type: adjustType, note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "調整失敗");
      }
      const data = await res.json() as { stock: number };
      const log: StockLog = {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        type: adjustType,
        delta,
        stockBefore: product.stock,
        stockAfter: data.stock,
        note,
        createdAt: new Date().toISOString(),
      };
      onSuccess(data.stock, log);
    } catch (e) {
      setError(e instanceof Error ? e.message : "調整失敗，請稍後重試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-xl border border-[#e8ded3] w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b border-[#e8ded3]">
          <div>
            <h3 className="font-semibold text-[#302b26]">庫存調整</h3>
            <p className="text-xs text-[#8a7f75] mt-0.5 truncate max-w-[260px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#f8f5ef] rounded-lg transition-colors">
            <X size={16} className="text-[#8a7f75]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 目前庫存 */}
          <div className="rounded-xl bg-[#f8f5ef] border border-[#e8ded3] p-4 flex justify-between items-center">
            <span className="text-sm text-[#675e53]">目前庫存</span>
            <span className="font-mono font-bold text-xl text-[#302b26]">{product.stock} 件</span>
          </div>

          {/* 調整類型 */}
          <div>
            <label className="text-xs font-semibold text-[#675e53] mb-2 block">調整類型</label>
            <div className="grid grid-cols-3 gap-2">
              {(["restock", "adjustment", "deduction"] as AdjustType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setAdjustType(t)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    adjustType === t
                      ? "border-[#935941] bg-[#935941]/10 text-[#935941]"
                      : "border-[#e8ded3] text-[#675e53] hover:border-[#935941]/40"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 數量 */}
          <div>
            <label className="text-xs font-semibold text-[#675e53] mb-2 block">調整數量</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((v) => Math.max(1, v - 1))}
                className="p-2 rounded-xl border border-[#e8ded3] hover:bg-[#f8f5ef] transition-colors"
              >
                <Minus size={14} className="text-[#675e53]" />
              </button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center font-mono text-lg font-bold text-[#302b26] border border-[#e8ded3] rounded-xl py-2 outline-none focus:border-[#935941]"
              />
              <button
                onClick={() => setQty((v) => v + 1)}
                className="p-2 rounded-xl border border-[#e8ded3] hover:bg-[#f8f5ef] transition-colors"
              >
                <Plus size={14} className="text-[#675e53]" />
              </button>
            </div>
          </div>

          {/* 調整後預覽 */}
          <div className="rounded-xl bg-[#f8f5ef] border border-[#e8ded3] p-4 flex justify-between items-center">
            <span className="text-sm text-[#675e53]">調整後庫存</span>
            <span
              className="font-mono font-bold text-xl"
              style={{ color: newStock <= CRITICAL_THRESHOLD ? "#c0392b" : newStock <= LOW_STOCK_THRESHOLD ? "#8a5a14" : "#425847" }}
            >
              {newStock < 0 ? "⚠ 不足" : `${newStock} 件`}
            </span>
          </div>

          {/* 備注 */}
          <div>
            <label className="text-xs font-semibold text-[#675e53] mb-2 block">備注（選填）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：10 月定期補貨、盤點校正..."
              className="w-full border border-[#e8ded3] rounded-xl px-4 py-2 text-sm text-[#302b26] outline-none focus:border-[#935941] placeholder:text-[#c5b8ab]"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            className="flex-1 bg-[#935941] hover:bg-[#794632] text-white border-0"
            onClick={handleSubmit}
            disabled={submitting || newStock < 0}
          >
            {submitting ? "處理中..." : "確認調整"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<InventoryProduct | null>(null);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json() as { products: InventoryProduct[] };
        setProducts(data.products || []);
      }
    } catch {
      // 容錯
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchProducts(); }, []);

  const sorted = [...products].sort((a, b) => a.stock - b.stock);
  const criticalCount = sorted.filter((p) => p.stock <= CRITICAL_THRESHOLD).length;
  const lowCount = sorted.filter((p) => p.stock > CRITICAL_THRESHOLD && p.stock <= LOW_STOCK_THRESHOLD).length;
  const okCount = sorted.filter((p) => p.stock > LOW_STOCK_THRESHOLD).length;

  const handleAdjustSuccess = (productId: string, newStock: number, log: StockLog) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
    );
    setLogs((prev) => [log, ...prev]);
    setAdjustTarget(null);
  };

  return (
    <div>
      {/* 頁首 */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow text-[#935941]">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-[#302b26]">庫存管理</h1>
          <p className="mt-1 text-sm text-[#675e53]">
            即時庫存水位監控、入庫補貨與調整，所有異動皆記錄於操作日誌。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 border-[#e8ded3]"
              onClick={() => setShowLogs((v) => !v)}
            >
              <ClipboardList size={14} />
              操作日誌 ({logs.length})
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => void fetchProducts()}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            更新庫存
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="panel p-5 bg-white border border-rose-200 shadow-sm">
          <XCircle size={20} className="text-rose-600 mb-3" />
          <p className="text-xs text-rose-700 font-medium">即將缺貨（≤ {CRITICAL_THRESHOLD} 件）</p>
          <p className="mt-1 text-3xl font-mono font-bold text-rose-700">{criticalCount}</p>
        </div>
        <div className="panel p-5 bg-white border border-[#e2a84c]/30 shadow-sm">
          <AlertTriangle size={20} className="text-[#8a5a14] mb-3" />
          <p className="text-xs text-[#8a5a14] font-medium">庫存偏低（≤ {LOW_STOCK_THRESHOLD} 件）</p>
          <p className="mt-1 text-3xl font-mono font-bold text-[#8a5a14]">{lowCount}</p>
        </div>
        <div className="panel p-5 bg-white border border-[#68856b]/30 shadow-sm">
          <CheckCircle2 size={20} className="text-[#425847] mb-3" />
          <p className="text-xs text-[#425847] font-medium">庫存充足</p>
          <p className="mt-1 text-3xl font-mono font-bold text-[#425847]">{okCount}</p>
        </div>
      </div>

      {/* 缺貨警示橫幅 */}
      {criticalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700"
        >
          <AlertTriangle size={16} />
          有 <strong>{criticalCount}</strong> 款商品庫存嚴重不足，建議立即點擊「入庫補貨」以避免影響出貨。
        </motion.div>
      )}

      {/* 操作日誌面板 */}
      <AnimatePresence>
        {showLogs && logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm"
          >
            <div className="p-4 border-b border-[#e8ded3] flex justify-between items-center">
              <p className="text-sm font-semibold text-[#302b26]">本次操作日誌</p>
              <button
                onClick={() => setShowLogs(false)}
                className="text-xs text-[#8a7f75] hover:text-[#302b26]"
              >
                收起
              </button>
            </div>
            <div className="divide-y divide-[#e8ded3] max-h-60 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-4 py-3 text-xs">
                  <span
                    className="shrink-0 px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: TYPE_COLOR[log.type] + "18",
                      color: TYPE_COLOR[log.type],
                    }}
                  >
                    {TYPE_LABEL[log.type]}
                  </span>
                  <span className="font-medium text-[#302b26] flex-1 truncate">
                    {log.productName}
                  </span>
                  <span
                    className="font-mono font-bold shrink-0"
                    style={{ color: log.delta > 0 ? "#5b7b63" : "#c0392b" }}
                  >
                    {log.delta > 0 ? "+" : ""}{log.delta}
                  </span>
                  <span className="font-mono text-[#8a7f75] shrink-0">
                    {log.stockBefore} → {log.stockAfter}
                  </span>
                  {log.note && (
                    <span className="text-[#8a7f75] truncate max-w-[120px]">{log.note}</span>
                  )}
                  <span className="text-[#c5b8ab] shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 商品庫存表格 */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#e8ded3] bg-[#fcfaf7] text-xs font-semibold text-[#675e53]">
            <tr>
              <th className="p-4">商品</th>
              <th className="p-4">種類</th>
              <th className="p-4 text-center">當前庫存</th>
              <th className="p-4 text-center">狀態</th>
              <th className="p-4 text-right">售價</th>
              <th className="p-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8ded3]">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#8a7f75]">
                  <div className="mx-auto size-6 animate-spin rounded-full border-2 border-[#935941] border-t-transparent mb-2" />
                  同步庫存數據中...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#8a7f75]">
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  資料庫目前無商品
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
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="48px"
                            className="object-contain p-1"
                          />
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
                      <span className="text-xs text-[#8a7f75] font-normal ml-1">件</span>
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
                        {isCritical ? "即將缺貨" : isLow ? "庫存偏低" : "供應充足"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-semibold text-[#935941]">
                      {money(p.priceNt)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setAdjustTarget(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f8f5ef] text-[#935941] border border-[#e8ded3] hover:bg-[#935941]/10 hover:border-[#935941]/40 transition-colors"
                      >
                        <Plus size={12} />
                        調整庫存
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 調整 Dialog */}
      <AnimatePresence>
        {adjustTarget && (
          <AdjustDialog
            product={adjustTarget}
            onClose={() => setAdjustTarget(null)}
            onSuccess={(newStock, log) =>
              handleAdjustSuccess(adjustTarget.id, newStock, log)
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
