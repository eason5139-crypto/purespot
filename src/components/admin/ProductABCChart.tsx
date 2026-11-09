"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import type { ABCProductData } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

type ClassName = "A" | "B" | "C";
type Classified = ABCProductData & { rank: number; abc: ClassName; contributionPct: number; cumulativePct: number };
const COLORS: Record<ClassName, string> = { A: "#315F86", B: "#5B93C5", C: "#91a4a7" };

function classify(products: ABCProductData[], first: number, second: number): Classified[] {
  const ordered = [...products].sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
  const total = ordered.reduce((sum, product) => sum + product.revenue, 0);
  let cumulative = 0;
  return ordered.map((product, index) => {
    const before = cumulative;
    const contributionPct = total ? product.revenue / total * 100 : 0;
    cumulative += contributionPct;
    return { ...product, rank: index + 1, abc: before < first ? "A" : before < second ? "B" : "C", contributionPct, cumulativePct: cumulative };
  });
}

function csvCell(value: string | number | null) {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function ProductABCChart({ rawData, days, onDaysChange }: { rawData: ABCProductData[]; days: 7 | 30 | 90; onDaysChange: (days: 7 | 30 | 90) => void }) {
  const [threshold, setThreshold] = useState<"70/90" | "80/95">("70/90");
  const [category, setCategory] = useState("ALL");
  const [petType, setPetType] = useState("ALL");
  const [abcFilter, setAbcFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"rank" | "margin" | "sales">("rank");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = useMemo(() => classify(rawData, threshold === "70/90" ? 70 : 80, threshold === "70/90" ? 90 : 95), [rawData, threshold]);
  const categories = [...new Set(data.map((product) => product.category))].sort();
  const displayed = data.filter((product) => (category === "ALL" || product.category === category) && (petType === "ALL" || product.petType === petType) && (abcFilter === "ALL" || product.abc === abcFilter) && product.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "sales" ? b.salesQty - a.salesQty : sort === "margin" ? (b.marginPct ?? -Infinity) - (a.marginPct ?? -Infinity) : a.rank - b.rank);
  const selected = displayed.find((product) => product.productId === selectedId) ?? displayed[0];
  const totalRevenue = data.reduce((sum, product) => sum + product.revenue, 0);
  const complete = data.filter((product) => product.costCoveragePct === 100);
  const knownRevenue = complete.reduce((sum, product) => sum + product.revenue, 0);
  const totalProfit = complete.reduce((sum, product) => sum + (product.grossProfitNt ?? 0), 0);

  function downloadCsv() {
    const rows = [["ABC", "排名", "商品", "分類", "銷量", "商品營收", "營收占比%", "累計占比%", "銷貨成本", "毛利", "毛利率%", "成本性質"], ...displayed.map((product) => [product.abc, product.rank, product.name, product.category, product.salesQty, product.revenue, product.contributionPct.toFixed(1), product.cumulativePct.toFixed(1), product.cogsNt, product.grossProfitNt, product.marginPct, product.estimatedCost ? "含估算" : "實際/手動"])];
    const content = "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `purespot-abc-${days}d.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-6 text-[#263746]">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-semibold">商品 ABC 與毛利分析</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-[#687985]">依選定期間的商品營收排序；商品跨越 A 或 B 門檻時歸入當前級別。毛利＝商品營收－成交時單件成本 × 件數；不包含運費、廣告及其他營業費用。舊訂單缺少成本快照時，使用目前成本回推並標示估算。</p></div><button type="button" onClick={downloadCsv} disabled={!displayed.length} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#cbdce7] bg-white px-4 text-sm font-semibold text-[#315F86] disabled:opacity-40"><Download size={15} />下載目前表格</button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Summary label="商品營收" value={money(totalRevenue)} detail={`近 ${days} 日`} /><Summary label="可計算毛利" value={knownRevenue ? money(totalProfit) : "待補成本"} detail={`成本覆蓋 ${totalRevenue ? (knownRevenue / totalRevenue * 100).toFixed(1) : 0}% 商品營收`} /><Summary label="可計算商品毛利率" value={knownRevenue ? `${(totalProfit / knownRevenue * 100).toFixed(1)}%` : "—"} detail="僅統計成本完整的商品" /><Summary label="估算成本商品" value={`${data.filter((product) => product.estimatedCost).length} 款`} detail="可在商品管理改填實際報價" /></div>
    <div className="flex flex-wrap gap-3 rounded-2xl border border-[#dce5e9] bg-white p-4"><label className="text-xs font-medium">分析期間<select aria-label="ABC 分析期間" value={days} onChange={(event) => onDaysChange(Number(event.target.value) as 7 | 30 | 90)} className="input mt-1"><option value="7">近 7 日</option><option value="30">近 30 日</option><option value="90">近 90 日</option></select></label><label className="text-xs font-medium">ABC 門檻<select aria-label="ABC 門檻" value={threshold} onChange={(event) => setThreshold(event.target.value as typeof threshold)} className="input mt-1"><option value="70/90">70% / 90%</option><option value="80/95">80% / 95%</option></select></label><label className="text-xs font-medium">級別<select aria-label="ABC 級別" value={abcFilter} onChange={(event) => setAbcFilter(event.target.value)} className="input mt-1"><option value="ALL">全部</option><option value="A">A 類</option><option value="B">B 類</option><option value="C">C 類</option></select></label><label className="text-xs font-medium">分類<select aria-label="ABC 商品分類" value={category} onChange={(event) => setCategory(event.target.value)} className="input mt-1"><option value="ALL">全部分類</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label className="text-xs font-medium">毛孩<select aria-label="ABC 毛孩類型" value={petType} onChange={(event) => setPetType(event.target.value)} className="input mt-1"><option value="ALL">全部</option><option value="CAT">貓咪</option><option value="DOG">狗狗</option><option value="HAMSTER">倉鼠</option><option value="RABBIT">兔兔</option></select></label><label className="text-xs font-medium">排序<select aria-label="ABC 排序" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="input mt-1"><option value="rank">營收貢獻</option><option value="margin">毛利率</option><option value="sales">銷售件數</option></select></label><label className="relative min-w-[160px] flex-1 self-end"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b918f]" /><input aria-label="搜尋 ABC 商品" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋商品" className="input pl-9" /></label></div>
    {!data.length ? <div className="rounded-2xl border border-[#dce5e9] bg-white p-10 text-center text-sm text-[#8b918f]">所選期間沒有已成立訂單。可以切換到較長的分析期間。</div> : <><div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-[#dce5e9] bg-white p-5"><h4 className="font-semibold">營收貢獻排列</h4><p className="mt-1 text-xs text-[#8b918f]">橫條為單品商品營收，右側為累計占比。</p><div className="mt-5 max-h-80 space-y-3 overflow-y-auto">{data.slice(0, 15).map((product) => <button type="button" key={product.productId} onClick={() => setSelectedId(product.productId)} className={`grid w-full grid-cols-[120px_1fr_45px] items-center gap-3 rounded-lg p-2 text-left text-xs ${selected?.productId === product.productId ? "bg-[#edf5fa]" : "hover:bg-[#f8f5ef]"}`}><span className="truncate">{product.rank}. {product.name}</span><span className="h-3 overflow-hidden rounded-full bg-[#edf0f1]"><span className="block h-full rounded-full" style={{ width: `${totalRevenue ? product.revenue / data[0]!.revenue * 100 : 0}%`, background: COLORS[product.abc] }} /></span><span className="text-right">{product.cumulativePct.toFixed(0)}%</span></button>)}</div></section><section className="rounded-2xl border border-[#dce5e9] bg-[#f8f5ef] p-5"><h4 className="font-semibold">{selected ? `${selected.abc} 類 · ${selected.name}` : "選擇一款商品"}</h4>{selected && <div className="mt-4 space-y-3 text-sm"><p>商品營收 <strong className="float-right">{money(selected.revenue)}</strong></p><p>銷售件數 <strong className="float-right">{selected.salesQty} 件</strong></p><p>營收占比 <strong className="float-right">{selected.contributionPct.toFixed(1)}%</strong></p><p>毛利率 <strong className="float-right">{selected.marginPct == null ? "待補成本" : `${selected.marginPct.toFixed(1)}%`}</strong></p>{selected.estimatedCost && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">含公開價格估算成本，請以供應商報價核對。</p>}<p className="border-t border-[#dce5e9] pt-3 text-xs leading-6 text-[#687985]">{selected.abc === "A" ? "優先確認供應與安全庫存；高營收且低毛利時先檢查成本與售價。" : selected.abc === "B" ? "觀察回購與毛利，測試商品組合與陳列位置。" : "控制補貨量，檢查庫存週轉與商品頁表現。"}</p><Link href="/admin/products" className="inline-block text-xs font-semibold text-[#315F86] underline">檢查商品成本</Link></div>}</section></div>
      <div className="overflow-x-auto rounded-2xl border border-[#dce5e9] bg-white"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-[#f6f8f8] text-[#687985]"><tr>{["級別", "排名／商品", "分類", "銷量", "商品營收", "占比／累計", "銷貨成本", "毛利", "毛利率", "成本性質"].map((name) => <th key={name} className="px-3 py-3">{name}</th>)}</tr></thead><tbody className="divide-y divide-[#eef0ef]">{displayed.map((product) => <tr key={product.productId} className="hover:bg-[#f8f5ef]"><td className="px-3 py-3"><span className="rounded-full px-2 py-1 font-bold text-white" style={{ background: COLORS[product.abc] }}>{product.abc}</span></td><td className="px-3 py-3 font-semibold">{product.rank}. {product.name}</td><td className="px-3 py-3">{product.category}</td><td className="px-3 py-3">{product.salesQty}</td><td className="px-3 py-3">{money(product.revenue)}</td><td className="px-3 py-3">{product.contributionPct.toFixed(1)}% / {product.cumulativePct.toFixed(1)}%</td><td className="px-3 py-3">{product.cogsNt == null ? "待補" : money(product.cogsNt)}</td><td className="px-3 py-3">{product.grossProfitNt == null ? "—" : money(product.grossProfitNt)}</td><td className={`px-3 py-3 font-bold ${product.marginPct != null && product.marginPct < 20 ? "text-rose-700" : "text-[#315F86]"}`}>{product.marginPct == null ? "—" : `${product.marginPct.toFixed(1)}%`}</td><td className="px-3 py-3">{product.costCoveragePct < 100 ? "成本不完整" : product.estimatedCost ? "含估算" : "實際/手動"}</td></tr>)}{!displayed.length && <tr><td colSpan={10} className="p-8 text-center text-[#8b918f]">沒有符合篩選條件的商品。</td></tr>}</tbody></table></div></>}
  </div>;
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-[#dce5e9] bg-white p-5"><p className="text-xs text-[#687985]">{label}</p><p className="mt-2 text-2xl font-bold text-[#315F86]">{value}</p><p className="mt-2 text-xs text-[#8b918f]">{detail}</p></div>; }
