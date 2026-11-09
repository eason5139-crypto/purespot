"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Boxes, ClipboardList, PackagePlus, RefreshCw, Search, X } from "lucide-react";
import { money } from "@/lib/utils";
import { petLabels, type PetType } from "@/lib/types";

interface InventoryProduct {
  id: string; name: string; subtitle: string; type: PetType; category: string;
  priceNt: number; unitCostNt?: number | null; costSource?: "ESTIMATE" | "MANUAL" | null;
  stock: number; image: string;
}
interface StockLog {
  id: string; productName: string; type: string; delta: number; stockBefore: number;
  stockAfter: number; unitCostNt: number | null; costImpactNt: number | null; note: string; createdAt: string; batchId: string | null;
}
interface Spending { procurementNt: number; lossNt: number; totalNt: number; missingCostMovements: number }
const EMPTY_SPENDING: Spending = { procurementNt: 0, lossNt: 0, totalNt: 0, missingCostMovements: 0 };
const TYPE_LABEL: Record<string, string> = { RESTOCK: "進貨入庫", ADJUSTMENT: "手動校正", DEDUCTION: "耗損扣除" };

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [spending, setSpending] = useState<Spending>(EMPTY_SPENDING);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [batchNote, setBatchNote] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<InventoryProduct | null>(null);
  const [adjustType, setAdjustType] = useState<"adjustment" | "deduction">("adjustment");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustDirection, setAdjustDirection] = useState<"plus" | "minus">("minus");
  const [adjustNote, setAdjustNote] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productResponse, inventoryResponse] = await Promise.all([fetch("/api/admin/products", { cache: "no-store" }), fetch("/api/admin/inventory", { cache: "no-store" })]);
      const productData = await productResponse.json(); const inventoryData = await inventoryResponse.json();
      if (!productResponse.ok || !inventoryResponse.ok) throw new Error(productData.error ?? inventoryData.error ?? "無法讀取庫存");
      setProducts(productData.products ?? []); setLogs(inventoryData.logs ?? []); setSpending(inventoryData.spending ?? EMPTY_SPENDING); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "庫存暫時無法載入"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const filtered = useMemo(() => products.filter((product) => (category === "ALL" || product.category === category) && `${product.name} ${product.category} ${product.subtitle}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)), [products, category, query]);
  const selected = products.filter((product) => (quantities[product.id] ?? 0) > 0);
  const missingCost = selected.filter((product) => product.unitCostNt == null);
  const estimatedTotal = selected.reduce((sum, product) => sum + (quantities[product.id] ?? 0) * (product.unitCostNt ?? 0), 0);

  async function submitBatch() {
    if (!selected.length || missingCost.length) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: selected.map((product) => ({ productId: product.id, delta: quantities[product.id], type: "restock", note: batchNote.trim() })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "批次入庫失敗");
      setMessage(`已完成 ${selected.length} 款商品入庫，本次成本 ${money(data.estimatedTotalNt)}。`); setQuantities({}); setBatchNote(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "批次入庫失敗"); }
    finally { setSaving(false); }
  }

  async function submitAdjustment() {
    if (!adjustTarget || !adjustNote.trim() || adjustQty <= 0) return;
    const delta = adjustType === "deduction" || adjustDirection === "minus" ? -adjustQty : adjustQty;
    if (adjustTarget.stock + delta < 0) { setError("扣除數量不可超過現有庫存"); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/products/${adjustTarget.id}/stock`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta, type: adjustType, note: adjustNote.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "庫存調整失敗");
      setMessage(`${adjustTarget.name} 庫存已更新為 ${data.stock} 件。`); setAdjustTarget(null); setAdjustNote(""); setAdjustQty(1); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "庫存調整失敗"); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-7xl space-y-7 text-[#263746]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-[#5B93C5]">INVENTORY & COST</p><h1 className="mt-2 text-3xl font-semibold">庫存與進貨</h1><p className="mt-2 text-sm text-[#687985]">一次安排多款商品入庫，依每件成本預覽金額；異動會保存並納入營運報表。</p></div><button type="button" onClick={() => void load()} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#dce5e9] bg-white px-4 text-sm font-semibold text-[#315F86]"><RefreshCw size={16} />更新資料</button></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-[#e8f1f8] p-4 text-sm text-[#315F86]">{message}</p>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="本月進貨成本" value={money(spending.procurementNt)} detail="已完成入庫的成本合計" />
      <Metric title="本月耗損與負向校正" value={money(spending.lossNt)} detail="庫存減少的帳面成本" />
      <Metric title="本月庫存成本負擔" value={money(spending.totalNt)} detail="進貨成本＋耗損與負向校正" />
      <Metric title="低庫存商品" value={`${products.filter((product) => product.stock <= 20).length} 款`} detail="現有庫存 20 件以下" />
    </section>
    <p className="rounded-xl border border-[#cbdce7] bg-[#f1f7fb] px-4 py-3 text-xs leading-6 text-[#536a7a]">進貨成本是入庫金額；耗損與負向校正是已購庫存的減損，不代表再次付款。兩者分列並提供合計，避免重複解讀。既有庫存沒有歷史進貨紀錄，因此月統計從本次功能上線後的異動開始。</p>
    <section className="overflow-hidden rounded-[22px] border border-[#dce5e9] bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e9e7] p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><PackagePlus size={19} className="text-[#5B93C5]" />批次進貨表</h2><p className="mt-1 text-xs text-[#8b918f]">在需要入庫的商品輸入數量；一次確認，全部成功才會寫入庫存。</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b918f]" /><input aria-label="搜尋庫存商品" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋商品" className="min-h-10 rounded-xl border border-[#dce5e9] pl-9 pr-3 text-sm" /></label><select aria-label="篩選商品分類" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-10 rounded-xl border border-[#dce5e9] px-3 text-sm"><option value="ALL">全部分類</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></div></div>
      <div className="max-h-[550px] overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 z-10 bg-[#f6f8f8] text-xs text-[#687985]"><tr><th className="px-4 py-3">商品</th><th className="px-4 py-3">分類</th><th className="px-4 py-3 text-right">庫存</th><th className="px-4 py-3 text-right">售價</th><th className="px-4 py-3 text-right">進貨單價</th><th className="px-4 py-3 text-right">新增件數</th><th className="px-4 py-3 text-right">小計</th><th className="px-4 py-3">其他異動</th></tr></thead><tbody className="divide-y divide-[#eef0ef]">{loading && <tr><td colSpan={8} className="p-10 text-center">正在載入商品…</td></tr>}{!loading && filtered.map((product) => <tr key={product.id} className="hover:bg-[#faf9f6]"><td className="px-4 py-3"><div className="flex min-w-[180px] items-center gap-3"><div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#f6f0e8]"><Image src={product.image} alt="" fill sizes="48px" className="object-contain" /></div><span className="font-medium">{product.name}</span></div></td><td className="px-4 py-3 text-xs text-[#687985]">{petLabels[product.type]} · {product.category}</td><td className={`px-4 py-3 text-right font-semibold ${product.stock <= 10 ? "text-rose-700" : product.stock <= 20 ? "text-amber-700" : "text-[#315F86]"}`}>{product.stock}</td><td className="px-4 py-3 text-right">{money(product.priceNt)}</td><td className="px-4 py-3 text-right"><span className="font-semibold">{product.unitCostNt == null ? "待填" : money(product.unitCostNt)}</span>{product.costSource === "ESTIMATE" && <span className="block text-[11px] text-amber-700">估算</span>}</td><td className="px-4 py-3 text-right"><input type="number" min="0" max="100000" step="1" aria-label={`${product.name} 新增件數`} value={quantities[product.id] || ""} onChange={(event) => setQuantities((previous) => ({ ...previous, [product.id]: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))} placeholder="0" className="w-20 rounded-lg border border-[#cbdce7] p-2 text-right" /></td><td className="px-4 py-3 text-right font-semibold text-[#315F86]">{(quantities[product.id] ?? 0) > 0 ? product.unitCostNt == null ? "待填" : money((quantities[product.id] ?? 0) * product.unitCostNt) : "—"}</td><td className="px-4 py-3"><button type="button" onClick={() => { setAdjustTarget(product); setAdjustType("adjustment"); setAdjustQty(1); setAdjustDirection("minus"); setAdjustNote(""); }} className="rounded-lg border border-[#dce5e9] px-3 py-2 text-xs font-semibold text-[#315F86]">校正／耗損</button></td></tr>)}{!loading && !filtered.length && <tr><td colSpan={8} className="p-8 text-center text-[#8b918f]">沒有符合條件的商品</td></tr>}</tbody></table></div>
      <div className="flex flex-wrap items-end gap-4 border-t border-[#e7e9e7] bg-[#f8f5ef] p-5"><label className="min-w-[220px] flex-1 text-xs font-medium text-[#687985]">本批進貨備註（選填）<input value={batchNote} onChange={(event) => setBatchNote(event.target.value)} maxLength={200} placeholder="例：供應商報價單或進貨批次" className="input mt-1" /></label><div className="text-right"><p className="text-xs text-[#687985]">已選 {selected.length} 款商品 · 共 {selected.reduce((sum, product) => sum + (quantities[product.id] ?? 0), 0)} 件</p><p className="mt-1 text-2xl font-semibold text-[#315F86]">{money(estimatedTotal)}</p><p className="text-[11px] text-[#8b918f]">依目前成本試算，提交後記錄當下單價</p></div><button type="button" disabled={saving || !selected.length || !!missingCost.length} onClick={() => void submitBatch()} className="min-h-12 rounded-xl bg-[#315F86] px-6 text-sm font-semibold text-white disabled:opacity-40">{saving ? "入庫中…" : "確認批次入庫"}</button></div>{missingCost.length > 0 && <p className="px-5 pb-4 text-xs text-rose-700">有 {missingCost.length} 款商品尚未設定成本，請先至商品管理補齊。</p>}
    </section>
    <section className="rounded-[22px] border border-[#dce5e9] bg-white p-5"><button type="button" onClick={() => setShowLogs((value) => !value)} className="flex w-full items-center justify-between text-left"><span className="flex items-center gap-2 font-semibold"><ClipboardList size={18} className="text-[#5B93C5]" />庫存異動紀錄</span><span className="text-xs text-[#687985]">最近 {logs.length} 筆 · {showLogs ? "收起" : "展開"}</span></button>{showLogs && <div className="mt-5 max-h-80 divide-y divide-[#eef0ef] overflow-y-auto">{logs.length === 0 && <p className="py-5 text-sm text-[#8b918f]">尚無異動紀錄。</p>}{logs.map((log) => <div key={log.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[110px_1fr_80px_100px_100px_160px]"><span className="font-semibold text-[#315F86]">{TYPE_LABEL[log.type] ?? log.type}</span><span>{log.productName}<span className="block text-[#8b918f]">{log.note || "—"}</span></span><span className="font-semibold">{log.delta > 0 ? "+" : ""}{log.delta} 件</span><span>{log.stockBefore} → {log.stockAfter}</span><span>{log.costImpactNt == null ? "成本待填" : money(log.costImpactNt)}</span><span className="text-[#8b918f]">{new Date(log.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</span></div>)}</div>}</section>
    {adjustTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-[#172d3d]/50 p-4" role="dialog" aria-modal="true" aria-label="庫存校正與耗損"><div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold tracking-[.15em] text-[#5B93C5]">STOCK UPDATE</p><h2 className="mt-2 text-xl font-semibold">{adjustTarget.name}</h2></div><button type="button" aria-label="關閉" onClick={() => setAdjustTarget(null)}><X size={19} /></button></div><p className="mt-3 rounded-xl bg-[#f8f5ef] p-3 text-sm">目前庫存 {adjustTarget.stock} 件 · 單位成本 {adjustTarget.unitCostNt == null ? "待填" : money(adjustTarget.unitCostNt)}{adjustTarget.costSource === "ESTIMATE" ? "（估算）" : ""}</p><div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-medium">異動類型<select value={adjustType} onChange={(event) => setAdjustType(event.target.value as typeof adjustType)} className="input mt-1"><option value="adjustment">手動校正</option><option value="deduction">耗損扣除</option></select></label>{adjustType === "adjustment" && <label className="text-xs font-medium">校正方向<select value={adjustDirection} onChange={(event) => setAdjustDirection(event.target.value as typeof adjustDirection)} className="input mt-1"><option value="minus">減少庫存</option><option value="plus">增加庫存</option></select></label>}<label className="text-xs font-medium">件數<input type="number" min="1" max="100000" step="1" value={adjustQty} onChange={(event) => setAdjustQty(Math.max(0, Math.floor(Number(event.target.value) || 0)))} className="input mt-1" /></label></div><label className="mt-4 block text-xs font-medium">原因（必填）<input value={adjustNote} onChange={(event) => setAdjustNote(event.target.value)} maxLength={200} placeholder="例：盤點差異、包裝破損" className="input mt-1" /></label><div className="mt-5 rounded-xl bg-[#f1f7fb] p-4 text-sm"><p>調整後：{adjustTarget.stock + (adjustType === "deduction" || adjustDirection === "minus" ? -adjustQty : adjustQty)} 件</p><p className="mt-1 font-semibold">{adjustType === "deduction" || adjustDirection === "minus" ? "本次減損成本" : "增加庫存，不計入進貨支出"}：{adjustType === "deduction" || adjustDirection === "minus" ? adjustTarget.unitCostNt == null ? "待填" : money(adjustQty * adjustTarget.unitCostNt) : money(0)}</p></div><button type="button" disabled={saving || !adjustNote.trim() || !adjustQty || adjustTarget.stock + (adjustType === "deduction" || adjustDirection === "minus" ? -adjustQty : adjustQty) < 0 || adjustTarget.unitCostNt == null} onClick={() => void submitAdjustment()} className="mt-5 min-h-11 w-full rounded-xl bg-[#315F86] text-sm font-semibold text-white disabled:opacity-40">確認並記錄異動</button></div></div>}
  </div>;
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="rounded-[19px] border border-[#dce5e9] bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold text-[#687985]"><Boxes size={15} className="text-[#5B93C5]" />{title}</div><p className="mt-3 text-2xl font-bold text-[#315F86]">{value}</p><p className="mt-2 text-xs text-[#8b918f]">{detail}</p></div>;
}
