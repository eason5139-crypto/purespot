"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  ExternalLink,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { ABCProductData } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

type ClassName = "A" | "B" | "C";
type Basis = "revenue" | "profit" | "sales";
type Quadrant = "STAR" | "RISK" | "POTENTIAL" | "WATCH";

interface Classified extends ABCProductData {
  rank: number;
  abc: ClassName;
  basisValue: number;
  contributionPct: number;
  cumulativePct: number;
  avgUnitPrice: number;
  momentumPct: number | null;
  quadrant: Quadrant;
}

const CLASS_STYLE: Record<
  ClassName,
  {
    color: string;
    softBg: string;
    border: string;
    text: string;
    label: string;
    action: string;
  }
> = {
  A: {
    color: "#935941",
    softBg: "#fdf5ec",
    border: "#dfb89a",
    text: "#7c452f",
    label: "A 類主力",
    action: "確保不斷貨，嚴密監控進價與安全庫存",
  },
  B: {
    color: "#b8823c",
    softBg: "#fcf6e8",
    border: "#e2c896",
    text: "#875c21",
    label: "B 類成長",
    action: "觀察回購率，透過組合套組拉升件數",
  },
  C: {
    color: "#6b7c6e",
    softBg: "#f2f6f3",
    border: "#c4d2c7",
    text: "#455949",
    label: "C 類長尾",
    action: "控制採購深度，評估汰換或滿額加價購",
  },
};

const QUADRANT_META: Record<
  Quadrant,
  { label: string; bg: string; text: string; advice: string }
> = {
  STAR: {
    label: "高營收・高毛利",
    bg: "bg-[#eef5ef]",
    text: "text-[#35553a]",
    advice: "核心獲利品項，維持安全庫存與首頁主要曝光。",
  },
  RISK: {
    label: "高營收・低毛利",
    bg: "bg-[#fbeee9]",
    text: "text-[#9c3e2a]",
    advice: "賣得多但利潤薄，優先核對進貨成本或微調售價。",
  },
  POTENTIAL: {
    label: "低營收・高毛利",
    bg: "bg-[#fcf4df]",
    text: "text-[#8a5a14]",
    advice: "毛利體質優良，適合搭配 A 類商品做加購推廣。",
  },
  WATCH: {
    label: "低營收・低毛利",
    bg: "bg-[#f3efe9]",
    text: "text-[#6b5f54]",
    advice: "減少補貨批量，檢視商品定價與庫存週轉狀況。",
  },
};

const BASIS_META: Record<
  Basis,
  { label: string; format: (v: number) => string }
> = {
  revenue: { label: "商品營收", format: (v) => money(v) },
  profit: { label: "毛利總額", format: (v) => money(v) },
  sales: { label: "銷售件數", format: (v) => `${v.toLocaleString()} 件` },
};

const PET_LABELS: Record<string, string> = {
  CAT: "貓咪",
  DOG: "狗狗",
  HAMSTER: "倉鼠",
  RABBIT: "兔兔",
};

function getBasisValue(product: ABCProductData, basis: Basis): number {
  if (basis === "sales") return product.salesQty;
  if (basis === "profit") return Math.max(0, product.grossProfitNt ?? 0);
  return product.revenue;
}

function classify(
  products: ABCProductData[],
  first: number,
  second: number,
  basis: Basis,
): Classified[] {
  const ordered = [...products].sort(
    (a, b) =>
      getBasisValue(b, basis) - getBasisValue(a, basis) ||
      b.revenue - a.revenue ||
      a.name.localeCompare(b.name),
  );
  const totalBasis = ordered.reduce(
    (sum, product) => sum + getBasisValue(product, basis),
    0,
  );
  const avgRev =
    ordered.length > 0
      ? ordered.reduce((s, p) => s + p.revenue, 0) / ordered.length
      : 0;
  const withMargin = ordered.filter((p) => p.marginPct != null);
  const avgMargin =
    withMargin.length > 0
      ? withMargin.reduce((s, p) => s + (p.marginPct ?? 0), 0) /
        withMargin.length
      : 30;

  let cumulative = 0;
  return ordered.map((product, index) => {
    const before = cumulative;
    const basisValue = getBasisValue(product, basis);
    const contributionPct = totalBasis ? (basisValue / totalBasis) * 100 : 0;
    cumulative += contributionPct;

    const abc: ClassName =
      before < first ? "A" : before < second ? "B" : "C";
    const highRev = product.revenue >= avgRev;
    const highMargin = (product.marginPct ?? avgMargin) >= avgMargin;
    const quadrant: Quadrant =
      highRev && highMargin
        ? "STAR"
        : highRev && !highMargin
          ? "RISK"
          : !highRev && highMargin
            ? "POTENTIAL"
            : "WATCH";

    const momentumPct =
      product.qtyPrior > 0
        ? ((product.qtyRecent - product.qtyPrior) / product.qtyPrior) * 100
        : product.qtyRecent > 0
          ? 100
          : null;

    return {
      ...product,
      rank: index + 1,
      abc,
      basisValue,
      contributionPct,
      cumulativePct: Math.min(100, cumulative),
      avgUnitPrice:
        product.salesQty > 0 ? Math.round(product.revenue / product.salesQty) : 0,
      momentumPct,
      quadrant,
    };
  });
}

function csvCell(value: string | number | null) {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

// 簡易比例面積切片（Treemap 演算法）
interface TreemapRect {
  item: Classified;
  x: number;
  y: number;
  w: number;
  h: number;
}

function buildTreemap(
  items: Classified[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapRect[] {
  const valid = items.filter((i) => i.basisValue > 0);
  if (valid.length === 0 || w <= 0 || h <= 0) return [];
  if (valid.length === 1) {
    return [{ item: valid[0]!, x, y, w, h }];
  }

  const total = valid.reduce((s, i) => s + i.basisValue, 0);
  let acc = 0;
  let splitIdx = 1;
  for (let i = 0; i < valid.length; i++) {
    acc += valid[i]!.basisValue;
    if (acc >= total / 2) {
      splitIdx = Math.max(1, i + 1);
      if (splitIdx >= valid.length) splitIdx = valid.length - 1;
      break;
    }
  }

  const firstHalf = valid.slice(0, splitIdx);
  const secondHalf = valid.slice(splitIdx);
  const firstSum = firstHalf.reduce((s, i) => s + i.basisValue, 0);
  const ratio = total > 0 ? firstSum / total : 0.5;

  if (w >= h) {
    const w1 = w * ratio;
    return [
      ...buildTreemap(firstHalf, x, y, w1, h),
      ...buildTreemap(secondHalf, x + w1, y, w - w1, h),
    ];
  }
  const h1 = h * ratio;
  return [
    ...buildTreemap(firstHalf, x, y, w, h1),
    ...buildTreemap(secondHalf, x, y + h1, w, h - h1),
  ];
}

export function ProductABCChart({
  rawData,
  days,
  onDaysChange,
}: {
  rawData: ABCProductData[];
  days: 7 | 30 | 90;
  onDaysChange: (days: 7 | 30 | 90) => void;
}) {
  const [basis, setBasis] = useState<Basis>("revenue");
  const [aCut, setACut] = useState<number>(70);
  const [bCut, setBCut] = useState<number>(90);
  const [category, setCategory] = useState("ALL");
  const [petType, setPetType] = useState("ALL");
  const [abcFilter, setAbcFilter] = useState<"ALL" | ClassName>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"rank" | "margin" | "sales">("rank");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const data = useMemo(
    () => classify(rawData, aCut, bCut, basis),
    [rawData, aCut, bCut, basis],
  );

  const categories = useMemo(
    () => [...new Set(data.map((p) => p.category))].sort(),
    [data],
  );

  const displayed = useMemo(
    () =>
      data
        .filter(
          (p) =>
            (category === "ALL" || p.category === category) &&
            (petType === "ALL" || p.petType === petType) &&
            (abcFilter === "ALL" || p.abc === abcFilter) &&
            p.name.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "sales"
            ? b.salesQty - a.salesQty
            : sort === "margin"
              ? (b.marginPct ?? -Infinity) - (a.marginPct ?? -Infinity)
              : a.rank - b.rank,
        ),
    [data, category, petType, abcFilter, query, sort],
  );

  const activeId = hoveredId ?? selectedId;
  const selected =
    data.find((p) => p.productId === activeId) ?? displayed[0] ?? data[0];

  const totalRevenue = data.reduce((s, p) => s + p.revenue, 0);
  const totalBasis = data.reduce((s, p) => s + p.basisValue, 0);
  const complete = data.filter((p) => p.costCoveragePct === 100);
  const knownRevenue = complete.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = complete.reduce(
    (s, p) => s + (p.grossProfitNt ?? 0),
    0,
  );

  const classStats = useMemo(() => {
    return (["A", "B", "C"] as const).map((cls) => {
      const items = data.filter((p) => p.abc === cls);
      const basisSum = items.reduce((s, p) => s + p.basisValue, 0);
      const revSum = items.reduce((s, p) => s + p.revenue, 0);
      const marginItems = items.filter((p) => p.marginPct != null);
      const avgMargin =
        marginItems.length > 0
          ? marginItems.reduce((s, p) => s + (p.marginPct ?? 0), 0) /
            marginItems.length
          : null;
      return {
        cls,
        count: items.length,
        countPct: data.length ? (items.length / data.length) * 100 : 0,
        basisSum,
        basisPct: totalBasis ? (basisSum / totalBasis) * 100 : 0,
        revSum,
        avgMargin,
      };
    });
  }, [data, totalBasis]);

  // 柏拉圖前 14 名
  const paretoItems = useMemo(() => data.slice(0, 14), [data]);
  const paretoMaxBasis = Math.max(
    1,
    ...paretoItems.map((i) => i.basisValue),
  );

  // Treemap 前 18 名
  const treemapRects = useMemo(
    () => buildTreemap(data.slice(0, 18), 0, 0, 100, 100),
    [data],
  );

  // 四象限散點座標計算
  const scatterStats = useMemo(() => {
    const maxRev = Math.max(1, ...data.map((p) => p.revenue));
    const avgRev = data.length
      ? data.reduce((s, p) => s + p.revenue, 0) / data.length
      : 0;
    const withM = data.filter((p) => p.marginPct != null);
    const avgM = withM.length
      ? withM.reduce((s, p) => s + (p.marginPct ?? 0), 0) / withM.length
      : 30;
    const maxM = Math.max(60, ...withM.map((p) => p.marginPct ?? 0));
    const maxQty = Math.max(1, ...data.map((p) => p.salesQty));
    return { maxRev, avgRev, avgM, maxM, maxQty };
  }, [data]);

  function downloadCsv() {
    const rows = [
      [
        "ABC",
        "排名",
        "商品",
        "分類",
        "四象限",
        "銷量",
        "商品營收",
        `${BASIS_META[basis].label}占比%`,
        "累計占比%",
        "銷貨成本",
        "毛利",
        "毛利率%",
        "成本來源",
      ],
      ...displayed.map((p) => [
        p.abc,
        p.rank,
        p.name,
        p.category,
        QUADRANT_META[p.quadrant].label,
        p.salesQty,
        p.revenue,
        p.contributionPct.toFixed(1),
        p.cumulativePct.toFixed(1),
        p.cogsNt,
        p.grossProfitNt,
        p.marginPct != null ? p.marginPct.toFixed(1) : "",
        p.estimatedCost ? "估算" : "實際",
      ]),
    ];
    const content =
      "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `purespot-abc-${basis}-${days}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-[#302b26]">
      {/* 頂部精簡控制列：基準切換、期間、門檻滑桿、下載 */}
      <div className="rounded-2xl border border-[#e5d8c8] bg-white p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 計算基準切換 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#6e6257]">分類基準</span>
            <div className="flex rounded-xl border border-[#e5d8c8] bg-[#faf6f0] p-1">
              {(["revenue", "profit", "sales"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBasis(b)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    basis === b
                      ? "bg-[#935941] text-white shadow-2xs"
                      : "text-[#675b4f] hover:text-[#302b26]"
                  }`}
                >
                  {BASIS_META[b].label}
                </button>
              ))}
            </div>

            <span className="ml-2 text-xs font-bold text-[#6e6257]">期間</span>
            <div className="flex rounded-xl border border-[#e5d8c8] bg-[#faf6f0] p-1">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDaysChange(d)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                    days === d
                      ? "bg-[#302b26] text-white"
                      : "text-[#675b4f] hover:text-[#302b26]"
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={!displayed.length}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dfd0be] bg-[#faf6f0] px-3.5 text-xs font-bold text-[#5e4d3f] transition-colors hover:border-[#935941] hover:text-[#935941] disabled:opacity-40"
          >
            <Download size={14} />
            匯出 CSV
          </button>
        </div>

        {/* 即時可拖曳 A / B 門檻滑桿 */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[#f0e6da] pt-3.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#5e5043]">
            <SlidersHorizontal size={14} className="text-[#935941]" />
            A / B 門檻切線
          </span>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setACut(70);
                setBCut(90);
              }}
              className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold ${
                aCut === 70 && bCut === 90
                  ? "border-[#935941] bg-[#fdf5ec] text-[#935941]"
                  : "border-[#e5d8c8] text-[#6e6257]"
              }`}
            >
              70 / 90
            </button>
            <button
              type="button"
              onClick={() => {
                setACut(80);
                setBCut(95);
              }}
              className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold ${
                aCut === 80 && bCut === 95
                  ? "border-[#935941] bg-[#fdf5ec] text-[#935941]"
                  : "border-[#e5d8c8] text-[#6e6257]"
              }`}
            >
              80 / 95
            </button>
          </div>

          <label className="flex flex-1 min-w-[170px] items-center gap-2.5">
            <span className="shrink-0 font-bold text-[#935941]">
              A 類累計 ≤ {aCut}%
            </span>
            <input
              type="range"
              min={50}
              max={85}
              step={1}
              value={aCut}
              onChange={(e) => {
                const nextA = Number(e.target.value);
                setACut(nextA);
                if (bCut <= nextA + 5) setBCut(Math.min(98, nextA + 5));
              }}
              className="h-1.5 flex-1 cursor-pointer accent-[#935941]"
            />
          </label>

          <label className="flex flex-1 min-w-[170px] items-center gap-2.5">
            <span className="shrink-0 font-bold text-[#b8823c]">
              B 類累計 ≤ {bCut}%
            </span>
            <input
              type="range"
              min={Math.min(95, aCut + 5)}
              max={98}
              step={1}
              value={bCut}
              onChange={(e) => setBCut(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-[#b8823c]"
            />
          </label>
        </div>
      </div>

      {/* A / B / C 三級結構對比卡片（點擊即可篩選對應級別） */}
      <div className="grid gap-4 md:grid-cols-3">
        {classStats.map((stat) => {
          const st = CLASS_STYLE[stat.cls];
          const active = abcFilter === stat.cls;
          return (
            <motion.button
              key={stat.cls}
              type="button"
              whileHover={{ y: -2 }}
              onClick={() =>
                setAbcFilter((prev) => (prev === stat.cls ? "ALL" : stat.cls))
              }
              style={{
                borderColor: active ? st.color : "#e5d8c8",
                backgroundColor: active ? st.softBg : "#ffffff",
              }}
              className="rounded-2xl border-2 p-5 text-left transition-all shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-7 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
                    style={{ backgroundColor: st.color }}
                  >
                    {stat.cls}
                  </span>
                  <strong className="text-base font-bold text-[#302b26]">
                    {st.label}
                  </strong>
                </div>
                <span className="font-mono text-xs font-bold text-[#7c6d5e]">
                  {stat.count} 款（{stat.countPct.toFixed(0)}%）
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="block text-[11px] text-[#7c6d5e]">
                    {BASIS_META[basis].label}貢獻
                  </span>
                  <strong
                    className="font-mono text-2xl font-bold"
                    style={{ color: st.color }}
                  >
                    {BASIS_META[basis].format(stat.basisSum)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-[#7c6d5e]">
                    佔比 / 均毛利
                  </span>
                  <strong className="font-mono text-sm font-bold text-[#302b26]">
                    {stat.basisPct.toFixed(1)}% ·{" "}
                    {stat.avgMargin == null
                      ? "—"
                      : `${stat.avgMargin.toFixed(1)}%`}
                  </strong>
                </div>
              </div>

              {/* 比例條：品項數占比 vs 貢獻占比 */}
              <div className="mt-3 space-y-1.5">
                <div className="h-2 overflow-hidden rounded-full bg-[#f0e8de]">
                  <motion.div
                    animate={{ width: `${stat.basisPct}%` }}
                    transition={{ duration: 0.45 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: st.color }}
                  />
                </div>
                <p className="text-[11px] font-medium text-[#6b5d50]">
                  {st.action}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {!data.length ? (
        <div className="rounded-2xl border border-[#e5d8c8] bg-white p-12 text-center text-sm text-[#8a7f75]">
          所選期間無成交訂單資料
        </div>
      ) : (
        <>
          {/* 上方雙圖譜：柏拉圖雙軸累積曲線 ＋ 比例面積樹狀圖 (Treemap) */}
          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            {/* 圖譜 1：互動柏拉圖雙軸圖 */}
            <section className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#f0e6da]">
                <h3 className="text-sm font-bold text-[#302b26]">
                  柏拉圖雙軸累積曲線（{BASIS_META[basis].label} Top{" "}
                  {paretoItems.length}）
                </h3>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  {(["A", "B", "C"] as const).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1">
                      <span
                        className="size-2.5 rounded-sm"
                        style={{ backgroundColor: CLASS_STYLE[c].color }}
                      />
                      {c} 類
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 text-[#302b26]">
                    <span className="h-0.5 w-3 bg-[#302b26]" />
                    累計 %
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <svg
                  viewBox="0 0 720 275"
                  className="w-full min-w-[540px] select-none"
                  role="img"
                  aria-label="商品 ABC 柏拉圖雙軸累積圖"
                >
                  {/* 水平參考網格 25%, 50%, 75%, 100% */}
                  {[0, 25, 50, 75, 100].map((pct) => {
                    const y = 225 - (pct / 100) * 195;
                    return (
                      <g key={pct}>
                        <line
                          x1="44"
                          y1={y}
                          x2="676"
                          y2={y}
                          stroke="#f0e7dc"
                          strokeWidth="1"
                        />
                        <text
                          x="682"
                          y={y + 4}
                          fill="#8a7c6e"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {pct}%
                        </text>
                      </g>
                    );
                  })}

                  {/* 可動 A 類切線與 B 類切線 */}
                  {(() => {
                    const yA = 225 - (aCut / 100) * 195;
                    const yB = 225 - (bCut / 100) * 195;
                    return (
                      <>
                        <line
                          x1="44"
                          y1={yA}
                          x2="676"
                          y2={yA}
                          stroke="#935941"
                          strokeWidth="1.5"
                          strokeDasharray="5 4"
                        />
                        <text
                          x="48"
                          y={yA - 4}
                          fill="#935941"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          A 線 {aCut}%
                        </text>
                        <line
                          x1="44"
                          y1={yB}
                          x2="676"
                          y2={yB}
                          stroke="#b8823c"
                          strokeWidth="1.5"
                          strokeDasharray="5 4"
                        />
                        <text
                          x="110"
                          y={yB - 4}
                          fill="#b8823c"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          B 線 {bCut}%
                        </text>
                      </>
                    );
                  })()}

                  {/* 長條柱狀圖 */}
                  {paretoItems.map((item, idx) => {
                    const stepW = 620 / Math.max(1, paretoItems.length);
                    const barW = Math.min(34, stepW * 0.62);
                    const cx = 52 + idx * stepW + stepW / 2;
                    const barH = Math.max(
                      4,
                      (item.basisValue / paretoMaxBasis) * 185,
                    );
                    const isActive = selected?.productId === item.productId;

                    return (
                      <g
                        key={item.productId}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredId(item.productId)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setSelectedId(item.productId)}
                      >
                        <rect
                          x={cx - barW / 2}
                          y={225 - barH}
                          width={barW}
                          height={barH}
                          rx="5"
                          fill={CLASS_STYLE[item.abc].color}
                          opacity={isActive ? 1 : 0.78}
                          stroke={isActive ? "#302b26" : "none"}
                          strokeWidth={isActive ? 2 : 0}
                        />
                        <text
                          x={cx}
                          y="243"
                          textAnchor="middle"
                          fill={isActive ? "#935941" : "#6e6257"}
                          fontSize="9.5"
                          fontWeight={isActive ? "bold" : "normal"}
                        >
                          #{item.rank}
                        </text>
                        <text
                          x={cx}
                          y="258"
                          textAnchor="middle"
                          fill="#8a7c6e"
                          fontSize="8.5"
                        >
                          {item.name.slice(0, 4)}
                        </text>
                      </g>
                    );
                  })}

                  {/* 累計占比折線與節點 */}
                  {paretoItems.length > 0 && (
                    <>
                      <polyline
                        fill="none"
                        stroke="#302b26"
                        strokeWidth="2.2"
                        points={paretoItems
                          .map((item, idx) => {
                            const stepW = 620 / Math.max(1, paretoItems.length);
                            const cx = 52 + idx * stepW + stepW / 2;
                            const cy = 225 - (item.cumulativePct / 100) * 195;
                            return `${cx},${cy}`;
                          })
                          .join(" ")}
                      />
                      {paretoItems.map((item, idx) => {
                        const stepW = 620 / Math.max(1, paretoItems.length);
                        const cx = 52 + idx * stepW + stepW / 2;
                        const cy = 225 - (item.cumulativePct / 100) * 195;
                        const isActive = selected?.productId === item.productId;
                        return (
                          <circle
                            key={item.productId}
                            cx={cx}
                            cy={cy}
                            r={isActive ? 5.5 : 3.5}
                            fill={isActive ? "#935941" : "#ffffff"}
                            stroke="#302b26"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredId(item.productId)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => setSelectedId(item.productId)}
                          />
                        );
                      })}
                    </>
                  )}
                </svg>
              </div>
            </section>

            {/* 圖譜 2：比例面積樹狀圖 (Treemap) */}
            <section className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[#f0e6da]">
                <h3 className="text-sm font-bold text-[#302b26]">
                  貢獻面積樹狀圖
                </h3>
                <span className="font-mono text-[11px] font-semibold text-[#8a7c6e]">
                  面積＝{BASIS_META[basis].label}占比
                </span>
              </div>

              <div className="relative mt-4 h-[245px] w-full overflow-hidden rounded-xl border border-[#e5d8c8] bg-[#faf6f0]">
                {treemapRects.map(({ item, x, y, w, h }) => {
                  const isActive = selected?.productId === item.productId;
                  const st = CLASS_STYLE[item.abc];
                  const showLabel = w > 14 && h > 16;
                  return (
                    <button
                      key={item.productId}
                      type="button"
                      onMouseEnter={() => setHoveredId(item.productId)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedId(item.productId)}
                      title={`${item.abc}類 · ${item.name} (${item.contributionPct.toFixed(1)}%)`}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${w}%`,
                        height: `${h}%`,
                        backgroundColor: st.color,
                        opacity: isActive ? 1 : 0.84,
                      }}
                      className={`absolute flex flex-col justify-between overflow-hidden border border-white/80 p-2 text-left text-white transition-all ${
                        isActive ? "z-10 ring-2 ring-[#302b26]" : "hover:opacity-100"
                      }`}
                    >
                      {showLabel && (
                        <>
                          <span className="truncate text-[11px] font-bold leading-tight">
                            {item.name}
                          </span>
                          <span className="font-mono text-[10px] font-semibold opacity-90">
                            {item.abc} · {item.contributionPct.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* 中段：營收 × 毛利率四象限氣泡散點圖 ＋ 右側單品診斷卡 */}
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            {/* 圖譜 3：營收 × 毛利率四象限氣泡散點圖 */}
            <section className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#f0e6da]">
                <h3 className="text-sm font-bold text-[#302b26]">
                  營收 × 毛利率四象限氣泡圖
                </h3>
                <span className="font-mono text-[11px] text-[#8a7c6e]">
                  氣泡大小＝銷售件數 · 十字線＝全店均值
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <svg
                  viewBox="0 0 680 280"
                  className="w-full min-w-[520px] select-none"
                  role="img"
                  aria-label="商品營收與毛利率四象限氣泡散點圖"
                >
                  {(() => {
                    const padL = 50;
                    const padR = 24;
                    const padT = 22;
                    const padB = 34;
                    const plotW = 680 - padL - padR;
                    const plotH = 280 - padT - padB;
                    const avgX =
                      padL +
                      (scatterStats.avgRev / scatterStats.maxRev) * plotW;
                    const avgY =
                      padT +
                      plotH -
                      (scatterStats.avgM / scatterStats.maxM) * plotH;

                    return (
                      <>
                        {/* 四象限底色區塊 */}
                        <rect
                          x={avgX}
                          y={padT}
                          width={padL + plotW - avgX}
                          height={avgY - padT}
                          fill="#eef5ef"
                          opacity="0.65"
                        />
                        <rect
                          x={avgX}
                          y={avgY}
                          width={padL + plotW - avgX}
                          height={padT + plotH - avgY}
                          fill="#fbeee9"
                          opacity="0.6"
                        />
                        <rect
                          x={padL}
                          y={padT}
                          width={avgX - padL}
                          height={avgY - padT}
                          fill="#fcf5e3"
                          opacity="0.6"
                        />
                        <rect
                          x={padL}
                          y={avgY}
                          width={avgX - padL}
                          height={padT + plotH - avgY}
                          fill="#f7f3ed"
                          opacity="0.7"
                        />

                        {/* 外框與均值十字線 */}
                        <rect
                          x={padL}
                          y={padT}
                          width={plotW}
                          height={plotH}
                          fill="none"
                          stroke="#e2d5c6"
                          strokeWidth="1"
                        />
                        <line
                          x1={avgX}
                          y1={padT}
                          x2={avgX}
                          y2={padT + plotH}
                          stroke="#b8a590"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />
                        <line
                          x1={padL}
                          y1={avgY}
                          x2={padL + plotW}
                          y2={avgY}
                          stroke="#b8a590"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />

                        {/* 象限標籤 */}
                        <text
                          x={padL + plotW - 8}
                          y={padT + 16}
                          textAnchor="end"
                          fill="#35553a"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          高營收・高毛利（核心主力）
                        </text>
                        <text
                          x={padL + plotW - 8}
                          y={padT + plotH - 8}
                          textAnchor="end"
                          fill="#9c3e2a"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          高營收・低毛利（成本警示）
                        </text>
                        <text
                          x={padL + 8}
                          y={padT + 16}
                          fill="#8a5a14"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          低營收・高毛利（潛力推廣）
                        </text>
                        <text
                          x={padL + 8}
                          y={padT + plotH - 8}
                          fill="#786b5e"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          低營收・低毛利（長尾觀察）
                        </text>

                        {/* 座標軸刻度 */}
                        <text
                          x={padL - 8}
                          y={padT + 4}
                          textAnchor="end"
                          fill="#8a7c6e"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {Math.round(scatterStats.maxM)}%
                        </text>
                        <text
                          x={padL - 8}
                          y={avgY + 3}
                          textAnchor="end"
                          fill="#6e6257"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {scatterStats.avgM.toFixed(0)}%
                        </text>
                        <text
                          x={padL - 8}
                          y={padT + plotH}
                          textAnchor="end"
                          fill="#8a7c6e"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          0%
                        </text>
                        <text
                          x={padL + plotW / 2}
                          y={272}
                          textAnchor="middle"
                          fill="#7c6d5e"
                          fontSize="10"
                        >
                          商品營收（NT$）→
                        </text>

                        {/* 氣泡節點 */}
                        {data.map((item) => {
                          const marginVal = item.marginPct ?? scatterStats.avgM;
                          const cx =
                            padL +
                            Math.min(
                              1,
                              item.revenue / scatterStats.maxRev,
                            ) *
                              (plotW - 18) +
                            9;
                          const cy =
                            padT +
                            plotH -
                            Math.min(1, Math.max(0, marginVal / scatterStats.maxM)) *
                              (plotH - 18) -
                            9;
                          const r =
                            6 +
                            Math.sqrt(item.salesQty / scatterStats.maxQty) * 14;
                          const isActive =
                            selected?.productId === item.productId;
                          return (
                            <g
                              key={item.productId}
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredId(item.productId)}
                              onMouseLeave={() => setHoveredId(null)}
                              onClick={() => setSelectedId(item.productId)}
                            >
                              {isActive && (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={r + 5}
                                  fill="none"
                                  stroke="#302b26"
                                  strokeWidth="1.5"
                                  strokeDasharray="3 2"
                                />
                              )}
                              <circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill={CLASS_STYLE[item.abc].color}
                                opacity={isActive ? 0.96 : 0.72}
                                stroke="#ffffff"
                                strokeWidth="1.8"
                              />
                              <text
                                x={cx}
                                y={cy + 3}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="9"
                                fontWeight="bold"
                              >
                                {item.rank}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </section>

            {/* 右側：單品詳盡診斷卡 */}
            <section className="rounded-2xl border border-[#e5d8c8] bg-[#faf6f0] p-5 flex flex-col justify-between">
              {selected ? (
                <>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5d8c8] pb-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-white"
                          style={{
                            backgroundColor: CLASS_STYLE[selected.abc].color,
                          }}
                        >
                          {selected.abc} 類 · #{selected.rank}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            QUADRANT_META[selected.quadrant].bg
                          } ${QUADRANT_META[selected.quadrant].text}`}
                        >
                          {QUADRANT_META[selected.quadrant].label}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-[#7c6d5e]">
                        {selected.category} ·{" "}
                        {PET_LABELS[selected.petType] ?? selected.petType}
                      </span>
                    </div>

                    <h4 className="mt-3 text-lg font-bold text-[#302b26]">
                      {selected.name}
                    </h4>

                    {/* 6 格單品核心指標 */}
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <MetricBox
                        label="商品營收"
                        value={money(selected.revenue)}
                        accent="#935941"
                      />
                      <MetricBox
                        label="銷售件數 / 均價"
                        value={`${selected.salesQty} 件 · ${money(selected.avgUnitPrice)}`}
                      />
                      <MetricBox
                        label={`${BASIS_META[basis].label}占比 / 累計`}
                        value={`${selected.contributionPct.toFixed(1)}% / ${selected.cumulativePct.toFixed(1)}%`}
                      />
                      <MetricBox
                        label="毛利額 / 毛利率"
                        value={
                          selected.marginPct == null
                            ? "待補成本"
                            : `${money(selected.grossProfitNt ?? 0)} (${selected.marginPct.toFixed(1)}%)`
                        }
                        accent={
                          selected.marginPct != null && selected.marginPct < 20
                            ? "#b43d2a"
                            : "#4e6752"
                        }
                      />
                      <MetricBox
                        label="近 7 日銷量動能"
                        value={
                          selected.momentumPct == null
                            ? `${selected.qtyRecent} 件`
                            : `${selected.qtyRecent} 件 (${selected.momentumPct >= 0 ? "+" : ""}${selected.momentumPct.toFixed(0)}%)`
                        }
                        accent={
                          selected.momentumPct != null &&
                          selected.momentumPct >= 0
                            ? "#4e6752"
                            : "#b43d2a"
                        }
                      />
                      <MetricBox
                        label="成本狀態"
                        value={
                          selected.costCoveragePct < 100
                            ? `覆蓋 ${selected.costCoveragePct}%`
                            : selected.estimatedCost
                              ? "含估算成本"
                              : "實際報價"
                        }
                      />
                    </div>

                    {/* 營運處置建議 */}
                    <div className="mt-4 rounded-xl border border-[#e2d4c2] bg-white p-3.5 text-xs leading-5 text-[#5a4d40]">
                      <strong className="text-[#935941]">營運處置：</strong>
                      {QUADRANT_META[selected.quadrant].advice}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e5d8c8] pt-3.5">
                    <Link
                      href="/admin/products"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#935941] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#7d4934]"
                    >
                      調整成本與售價
                      <ExternalLink size={13} />
                    </Link>
                    <Link
                      href="/admin/inventory"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#d8c8b4] bg-white px-3.5 py-2 text-xs font-bold text-[#5e5043] hover:border-[#935941]"
                    >
                      前往補貨管理
                    </Link>
                  </div>
                </>
              ) : null}
            </section>
          </div>

          {/* 總覽統計摘要列 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary
              label="分析期商品營收"
              value={money(totalRevenue)}
              detail={`近 ${days} 日 · 共 ${data.length} 款成交`}
            />
            <Summary
              label="可計算毛利總額"
              value={knownRevenue ? money(totalProfit) : "待補成本"}
              detail={`成本覆蓋 ${totalRevenue ? ((knownRevenue / totalRevenue) * 100).toFixed(1) : 0}%`}
            />
            <Summary
              label="整體商品毛利率"
              value={
                knownRevenue
                  ? `${((totalProfit / knownRevenue) * 100).toFixed(1)}%`
                  : "—"
              }
              detail="已扣除單件成本"
            />
            <Summary
              label="高營收低毛利警示"
              value={`${data.filter((p) => p.quadrant === "RISK").length} 款`}
              detail="建議優先檢核進價"
            />
          </div>

          {/* 底部明細篩選與表格 */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#e5d8c8] bg-white p-4">
              <label className="text-xs font-bold text-[#6e6257]">
                級別
                <select
                  aria-label="ABC 級別"
                  value={abcFilter}
                  onChange={(e) =>
                    setAbcFilter(e.target.value as "ALL" | ClassName)
                  }
                  className="input !mt-1 !min-h-9 !py-1 text-xs"
                >
                  <option value="ALL">全部</option>
                  <option value="A">A 類</option>
                  <option value="B">B 類</option>
                  <option value="C">C 類</option>
                </select>
              </label>

              <label className="text-xs font-bold text-[#6e6257]">
                分類
                <select
                  aria-label="ABC 商品分類"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input !mt-1 !min-h-9 !py-1 text-xs"
                >
                  <option value="ALL">全部分類</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold text-[#6e6257]">
                物種
                <select
                  aria-label="ABC 毛孩類型"
                  value={petType}
                  onChange={(e) => setPetType(e.target.value)}
                  className="input !mt-1 !min-h-9 !py-1 text-xs"
                >
                  <option value="ALL">全部</option>
                  <option value="CAT">貓咪</option>
                  <option value="DOG">狗狗</option>
                  <option value="HAMSTER">倉鼠</option>
                  <option value="RABBIT">兔兔</option>
                </select>
              </label>

              <label className="text-xs font-bold text-[#6e6257]">
                排序
                <select
                  aria-label="ABC 排序"
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value as "rank" | "margin" | "sales")
                  }
                  className="input !mt-1 !min-h-9 !py-1 text-xs"
                >
                  <option value="rank">{BASIS_META[basis].label}排名</option>
                  <option value="margin">毛利率</option>
                  <option value="sales">銷售件數</option>
                </select>
              </label>

              <label className="relative min-w-[180px] flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7c6e]"
                />
                <input
                  aria-label="搜尋 ABC 商品"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋商品名稱"
                  className="input !mt-0 !min-h-9 !py-1 !pl-9 text-xs"
                />
              </label>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#e5d8c8] bg-white">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-[#faf6f0] text-[#6e6257]">
                  <tr>
                    {[
                      "級別",
                      "排名／商品",
                      "分類",
                      "四象限",
                      "銷量",
                      "週動能",
                      "商品營收",
                      "占比／累計",
                      "毛利",
                      "毛利率",
                      "成本",
                    ].map((name) => (
                      <th key={name} className="px-3.5 py-3 font-bold">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2e9de]">
                  {displayed.map((product) => {
                    const isSel = selected?.productId === product.productId;
                    return (
                      <tr
                        key={product.productId}
                        onClick={() => setSelectedId(product.productId)}
                        className={`cursor-pointer transition-colors ${
                          isSel ? "bg-[#fdf5ec]" : "hover:bg-[#faf6f0]"
                        }`}
                      >
                        <td className="px-3.5 py-3">
                          <span
                            className="inline-flex size-6 items-center justify-center rounded-md font-mono font-bold text-white"
                            style={{
                              backgroundColor: CLASS_STYLE[product.abc].color,
                            }}
                          >
                            {product.abc}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-bold text-[#302b26]">
                          {product.rank}. {product.name}
                        </td>
                        <td className="px-3.5 py-3 text-[#6b5d50]">
                          {product.category}
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              QUADRANT_META[product.quadrant].bg
                            } ${QUADRANT_META[product.quadrant].text}`}
                          >
                            {QUADRANT_META[product.quadrant].label}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono">
                          {product.salesQty}
                        </td>
                        <td className="px-3.5 py-3 font-mono">
                          {product.momentumPct == null ? (
                            <span className="text-[#9c8e80]">—</span>
                          ) : product.momentumPct >= 0 ? (
                            <span className="inline-flex items-center text-[#4e6752] font-bold">
                              <ArrowUpRight size={12} />+
                              {product.momentumPct.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[#b43d2a] font-bold">
                              <ArrowDownRight size={12} />
                              {product.momentumPct.toFixed(0)}%
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-mono font-semibold text-[#302b26]">
                          {money(product.revenue)}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[#6b5d50]">
                          {product.contributionPct.toFixed(1)}% /{" "}
                          {product.cumulativePct.toFixed(1)}%
                        </td>
                        <td className="px-3.5 py-3 font-mono">
                          {product.grossProfitNt == null
                            ? "—"
                            : money(product.grossProfitNt)}
                        </td>
                        <td
                          className={`px-3.5 py-3 font-mono font-bold ${
                            product.marginPct != null && product.marginPct < 20
                              ? "text-[#b43d2a]"
                              : "text-[#4e6752]"
                          }`}
                        >
                          {product.marginPct == null
                            ? "—"
                            : `${product.marginPct.toFixed(1)}%`}
                        </td>
                        <td className="px-3.5 py-3 text-[#7c6d5e]">
                          {product.costCoveragePct < 100
                            ? "不完整"
                            : product.estimatedCost
                              ? "估算"
                              : "實際"}
                        </td>
                      </tr>
                    );
                  })}
                  {!displayed.length && (
                    <tr>
                      <td
                        colSpan={11}
                        className="p-8 text-center text-[#8a7c6e]"
                      >
                        無符合條件商品
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[#e5d8c8] bg-white p-3">
      <span className="block text-[10px] font-semibold text-[#8a7c6e]">
        {label}
      </span>
      <strong
        className="mt-1 block font-mono text-sm font-bold"
        style={{ color: accent ?? "#302b26" }}
      >
        {value}
      </strong>
    </div>
  );
}

function Summary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs">
      <p className="text-xs font-semibold text-[#7c6d5e]">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-[#935941]">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-[#8a7c6e]">{detail}</p>
    </div>
  );
}
