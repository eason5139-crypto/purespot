"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Download,
  ExternalLink,
  Grid3X3,
  Link2,
  Maximize2,
  Minimize2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { ABCProductData } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

type ClassName = "A" | "B" | "C";
type Basis = "revenue" | "profit" | "sales";
type ViewMode = "grid" | "pareto";

interface Classified extends ABCProductData {
  rank: number;
  abc: ClassName;
  basisValue: number;
  contributionPct: number;
  cumulativePct: number;
  avgUnitPrice: number;
  velocity: number; // 近期動能 (-1 ~ +inf)
  momentumPct: number | null;
  healthScore: number; // 0-100 綜合健康分
  xBand: 0 | 1 | 2; // 0=低毛利, 1=中毛利, 2=高毛利
  yBand: 0 | 1 | 2; // 0=低銷量, 1=中銷量, 2=高銷量
  zoneKey: string;
  zoneLabel: string;
  strategy: string;
}

const CLASS_STYLE: Record<
  ClassName,
  {
    color: string;
    softBg: string;
    border: string;
    label: string;
    shortDesc: string;
  }
> = {
  A: {
    color: "#4e6752",
    softBg: "#eff5f0",
    border: "#bcd0bf",
    label: "核心商品",
    shortDesc: "主力貢獻品項",
  },
  B: {
    color: "#b8823c",
    softBg: "#fcf6e8",
    border: "#e2c896",
    label: "穩定商品",
    shortDesc: "中堅成長品項",
  },
  C: {
    color: "#935941",
    softBg: "#fdf3ec",
    border: "#dfb89a",
    label: "觀察商品",
    shortDesc: "長尾待優化品項",
  },
};

// 九宮格分區定義 [yBand][xBand] (y: 0=低銷量, 1=中銷量, 2=高銷量；x: 0=低毛利, 1=中毛利, 2=高毛利)
const ZONE_LABELS: [
  [string, string, string],
  [string, string, string],
  [string, string, string],
] = [
  ["淘汰候選", "觀察中", "利潤型"],
  ["普通品", "穩定型", "精品型"],
  ["走量型", "明星商品", "雙高之星"],
];

// 品牌暖色系九宮格底色 [yBand][xBand]
const ZONE_FILLS: [
  [string, string, string],
  [string, string, string],
  [string, string, string],
] = [
  ["rgba(168, 74, 54, 0.065)", "rgba(148, 134, 118, 0.045)", "rgba(184, 130, 60, 0.075)"],
  ["rgba(148, 134, 118, 0.045)", "rgba(184, 130, 60, 0.055)", "rgba(184, 130, 60, 0.10)"],
  ["rgba(147, 89, 65, 0.075)", "rgba(78, 103, 82, 0.085)", "rgba(78, 103, 82, 0.145)"],
];

const ZONE_BADGE_STYLE: Record<string, string> = {
  雙高之星: "bg-[#e7f1e8] text-[#2f4d34] border-[#c4dac7]",
  明星商品: "bg-[#eef5ef] text-[#3a5a3f] border-[#cee0d1]",
  走量型: "bg-[#faeee7] text-[#8a452d] border-[#e6c5b3]",
  精品型: "bg-[#fcf3df] text-[#875817] border-[#e7d09c]",
  穩定型: "bg-[#f6f1ea] text-[#5e5246] border-[#e0d3c3]",
  普通品: "bg-[#f4f0eb] text-[#6d6257] border-[#dfd5c9]",
  利潤型: "bg-[#fcf4e2] text-[#8c5e1c] border-[#e6cfa0]",
  觀察中: "bg-[#f5f1ec] text-[#75685b] border-[#e2d8cc]",
  淘汰候選: "bg-[#fbece8] text-[#9b3d28] border-[#e8bfb4]",
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

// SVG 畫布常數（對齊 POS 九宮格比例並加大可讀性）
const PAD = { left: 58, right: 24, top: 24, bottom: 54 };
const SVG_W = 760;
const SVG_H = 420;
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

function getBasisValue(product: ABCProductData, basis: Basis): number {
  if (basis === "sales") return product.salesQty;
  if (basis === "profit") return Math.max(0, product.grossProfitNt ?? 0);
  return product.revenue;
}

/** 六維度交叉營運策略建議（毛利 × 銷量排名 × 成長動能 × 貢獻比 × 共購商品 × 熱門時段） */
function buildStrategy(
  p: {
    abc: ClassName;
    marginPct: number | null;
    salesQty: number;
    contributionPct: number;
    velocity: number;
    bestPair?: string | null;
    peakHour?: number | null;
    estimatedCost: boolean;
  },
  maxQty: number,
): string {
  const margin = p.marginPct;
  const isHighMargin = margin !== null && margin >= 55;
  const isMidMargin = margin !== null && margin >= 35 && margin < 55;
  const isLowMargin = margin !== null && margin < 35;

  const qtyRank = maxQty > 0 ? p.salesQty / maxQty : 0;
  const isTopQty = qtyRank > 0.65;
  const isMidQty = qtyRank > 0.3 && qtyRank <= 0.65;
  const isLowQty = qtyRank <= 0.3;

  const isRising = p.velocity > 0.15;
  const isDeclining = p.velocity < -0.15;
  const isKeyRev = p.contributionPct > 8;
  const pair = p.bestPair ?? "";
  const hasPair = pair.length > 0;
  const hour = p.peakHour;
  const peakHint =
    hour != null
      ? hour >= 20 || hour <= 1
        ? "晚間下單最集中，可於夜間推播補貨提醒。"
        : hour >= 11 && hour <= 14
          ? "午間流量最高，適合置頂於午休首頁推薦。"
          : ""
      : "";

  if (p.abc === "A") {
    if (margin === null) {
      return "主力商品尚未建立單位成本，建議先至商品庫存補齊進價，才能確認實際獲利空間。";
    }
    if (isHighMargin && isTopQty && isKeyRev && isRising) {
      return `核心獲利引擎，高毛利高銷量且持續成長。優先鎖定安全庫存避免缺貨${hasPair ? `，並與「${pair}」組成固定套組拉升客單價` : ""}。`;
    }
    if (isHighMargin && isTopQty && isDeclining) {
      return "核心高利品項近 7 日銷量下滑，先核對庫存規格是否齊全、評價回饋與站內曝光位置，避免直接降價。";
    }
    if (isHighMargin && isTopQty) {
      return `雙高主力商品，維持穩定供貨為第一要務。${hasPair ? `「${pair}」共購率高，適合建立搭配優惠組合。` : "可推定期配方案穩固回購。"}${peakHint}`;
    }
    if (isHighMargin && isMidQty && isRising) {
      return `毛利優良且動能向上，具備成為全店頭牌潛力。${hasPair ? `搭配「${pair}」設定組合價` : "提升首頁與分類置頂曝光"}可加速放量。`;
    }
    if (isHighMargin && isLowQty) {
      return `單件獲利能力強但購買人數尚有空間。${hasPair ? `可綁定「${pair}」做加購推薦，` : "強化商品頁成分亮點與首頁曝光，"}擴大新客轉化。`;
    }
    if (isMidMargin && isTopQty && isDeclining) {
      return "走量主力出現下滑且毛利中等，建議檢視供應商進價與促銷折扣力道，防止獲利受壓。";
    }
    if (isMidMargin && isTopQty) {
      return `銷量穩健、毛利中等。${hasPair ? `透過「${pair}」高毛利品項做搭售` : "向供應商洽談大量採購折扣或推大包裝規格"}，可直接拉升整體毛利額。`;
    }
    if (isLowMargin) {
      return "主力營收來源但毛利偏低，建議核對實際進貨成本、調整免運與折扣門檻，或搭配高毛利副食一起銷售。";
    }
    return `主力表現穩定${isRising ? "且動能向上，適合加大推廣" : isDeclining ? "但近期略降，建議追蹤庫存與回購週期" : "，維持現行定價與補貨節奏"}。`;
  }

  if (p.abc === "B") {
    if (margin === null) {
      return "具一定銷量但缺少成本設定，補齊進價後即可評估是否投入廣告或組合推廣。";
    }
    if (isHighMargin && (isTopQty || isRising)) {
      return `高毛利準主力且具成長動能，距離 A 類僅一步之遙。${hasPair ? `與「${pair}」打包推薦組合` : "納入首頁焦點與滿額推薦"}可加速升級。`;
    }
    if (isHighMargin && isDeclining) {
      return "高毛利商品近期銷量走弱，建議檢查分類排序是否被擠壓，並搭配會員點數加倍或試用組重新帶動。";
    }
    if (isHighMargin) {
      return `毛利體質佳的精品型商品。${hasPair ? `與「${pair}」共購率高，建議設為結帳加價購。` : "加強站內推薦位與回購提醒。"}${peakHint}`;
    }
    if (isMidMargin && isRising) {
      return `穩定且成長中的中堅品項，${hasPair ? `搭配「${pair}」組合銷售` : "維持穩定庫存與版位曝光"}有望推升至核心層級。`;
    }
    if (isMidMargin && isDeclining) {
      return "中等毛利且近 7 日銷量下滑，建議確認季節需求變化或微調組合優惠，避免落入觀察區。";
    }
    if (isLowMargin) {
      return "毛利偏薄的中間層商品，不建議單獨下殺折扣，改檢討採購成本、規格定價或僅作湊單配角。";
    }
    return "整體穩定的 B 類商品，持續監控補貨週轉與兩週銷量走勢。";
  }

  // C 類
  if (margin === null) {
    return "低銷量且缺少成本資料，優先補齊成本以判斷是否值得繼續備貨與佔用倉儲空間。";
  }
  if (isHighMargin && isRising) {
    return `高毛利且近期正在成長的潛力品項。${hasPair ? `與「${pair}」具共購關聯，適合包裝成推薦組合` : "提高分類曝光與成分特色說明"}，有機會快速拉升銷量。`;
  }
  if (isHighMargin) {
    return `單件利潤佳但買氣偏低，多半屬於曝光不足。${hasPair ? `放入「${pair}」商品頁的加購區` : "設為購物車滿額加價購或點數兌換推薦"}，測試真實需求。`;
  }
  if (isMidMargin && isRising) {
    return "毛利尚可且近期出現成長訊號，保留觀察 2 至 3 週並留意回購狀況。";
  }
  if (isLowMargin && isLowQty && isDeclining) {
    return "低銷量、低毛利且持續衰退，建議縮減採購深度、以滿額贈或清倉組合出清後評估下架。";
  }
  if (isLowMargin) {
    return "銷量與獲利貢獻雙低，建議停止補貨或重新議價定價，避免長期積壓庫存資金。";
  }
  return "低銷量觀察品項，可透過組合加購測試市場反應，若一個月內無起色再評估汰換。";
}

function classify(
  products: ABCProductData[],
  first: number,
  second: number,
  basis: Basis,
  zoomX: boolean,
): { items: Classified[]; minMargin: number; maxMargin: number; maxQty: number; maxRev: number } {
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
  const maxQty = Math.max(1, ...ordered.map((p) => p.salesQty));
  const maxRev = Math.max(1, ...ordered.map((p) => p.revenue));

  const validMargins = ordered
    .map((p) => p.marginPct)
    .filter((m): m is number => m !== null);
  const rawMinM = validMargins.length ? Math.min(...validMargins) : 0;
  const rawMaxM = validMargins.length ? Math.max(...validMargins) : 100;
  const minMargin = zoomX
    ? Math.max(0, Math.floor((rawMinM - 5) / 5) * 5)
    : 0;
  const maxMargin = zoomX
    ? Math.min(100, Math.max(minMargin + 15, Math.ceil((rawMaxM + 5) / 5) * 5))
    : 100;
  const marginSpan = Math.max(1, maxMargin - minMargin);

  let cumulative = 0;
  const items: Classified[] = ordered.map((product, index) => {
    const before = cumulative;
    const basisValue = getBasisValue(product, basis);
    const contributionPct = totalBasis ? (basisValue / totalBasis) * 100 : 0;
    cumulative += contributionPct;

    const abc: ClassName =
      before < first ? "A" : before < second ? "B" : "C";

    const velocity =
      product.qtyPrior > 0
        ? (product.qtyRecent - product.qtyPrior) / product.qtyPrior
        : product.qtyRecent > 0
          ? 1
          : 0;
    const momentumPct =
      product.qtyPrior > 0
        ? ((product.qtyRecent - product.qtyPrior) / product.qtyPrior) * 100
        : product.qtyRecent > 0
          ? 100
          : null;

    const qtyNorm = product.salesQty / maxQty;
    const marginVal = product.marginPct ?? 35;
    const healthScore = Math.round(
      Math.min(
        100,
        Math.max(
          0,
          marginVal * 0.45 +
            Math.min(1.5, Math.max(-1, velocity) + 1) * 18 +
            qtyNorm * 28,
        ),
      ),
    );

    const xNorm =
      product.marginPct !== null
        ? Math.min(1, Math.max(0, (product.marginPct - minMargin) / marginSpan))
        : 0.5;
    const xBand: 0 | 1 | 2 = xNorm < 1 / 3 ? 0 : xNorm < 2 / 3 ? 1 : 2;
    const yBand: 0 | 1 | 2 = qtyNorm < 1 / 3 ? 0 : qtyNorm < 2 / 3 ? 1 : 2;
    const zoneKey = `${xBand}-${yBand}`;
    const zoneLabel = ZONE_LABELS[yBand][xBand];

    const strategy = buildStrategy(
      {
        abc,
        marginPct: product.marginPct,
        salesQty: product.salesQty,
        contributionPct,
        velocity,
        bestPair: product.bestPair,
        peakHour: product.peakHour,
        estimatedCost: product.estimatedCost,
      },
      maxQty,
    );

    return {
      ...product,
      rank: index + 1,
      abc,
      basisValue,
      contributionPct,
      cumulativePct: Math.min(100, cumulative),
      avgUnitPrice:
        product.salesQty > 0 ? Math.round(product.revenue / product.salesQty) : 0,
      velocity,
      momentumPct,
      healthScore,
      xBand,
      yBand,
      zoneKey,
      zoneLabel,
      strategy,
    };
  });

  return { items, minMargin, maxMargin, maxQty, maxRev };
}

function csvCell(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [zoomX, setZoomX] = useState(false);
  const [aCut, setACut] = useState<number>(70);
  const [bCut, setBCut] = useState<number>(90);
  const [category, setCategory] = useState("ALL");
  const [petType, setPetType] = useState("ALL");
  const [abcFilter, setAbcFilter] = useState<"ALL" | ClassName>("ALL");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"rank" | "margin" | "sales" | "health">("rank");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const { items: data, minMargin, maxMargin, maxQty, maxRev } = useMemo(
    () => classify(rawData, aCut, bCut, basis, zoomX),
    [rawData, aCut, bCut, basis, zoomX],
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
            (!zoneFilter || p.zoneKey === zoneFilter) &&
            p.name.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "sales"
            ? b.salesQty - a.salesQty
            : sort === "margin"
              ? (b.marginPct ?? -Infinity) - (a.marginPct ?? -Infinity)
              : sort === "health"
                ? b.healthScore - a.healthScore
                : a.rank - b.rank,
        ),
    [data, category, petType, abcFilter, zoneFilter, query, sort],
  );

  const activeId = hoveredId ?? selectedId;
  const selected =
    data.find((p) => p.productId === activeId) ?? displayed[0] ?? data[0];
  const hoveredProduct = hoveredId
    ? data.find((p) => p.productId === hoveredId) ?? null
    : null;

  const totalBasis = data.reduce((s, p) => s + p.basisValue, 0);

  const classStats = useMemo(() => {
    return (["A", "B", "C"] as const).map((cls) => {
      const items = data.filter((p) => p.abc === cls);
      const basisSum = items.reduce((s, p) => s + p.basisValue, 0);
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
        avgMargin,
      };
    });
  }, [data, totalBasis]);

  // 九宮格每格計數
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of data) {
      counts[item.zoneKey] = (counts[item.zoneKey] ?? 0) + 1;
    }
    return counts;
  }, [data]);

  // 計算九宮格氣泡座標（加上輕微防重疊偏移，避免完全重疊無法點擊）
  const bubbles = useMemo(() => {
    const span = Math.max(1, maxMargin - minMargin);
    const ordered = [
      ...data.filter((p) => p.marginPct === null),
      ...data.filter((p) => p.marginPct !== null),
    ];

    const placed: Array<{ item: Classified; x: number; y: number; r: number }> = [];
    for (const item of ordered) {
      const xPct =
        item.marginPct !== null
          ? Math.min(0.98, Math.max(0.02, (item.marginPct - minMargin) / span))
          : 0.5;
      const yPct = Math.min(0.96, Math.max(0.05, item.salesQty / maxQty));
      let x = PAD.left + xPct * PLOT_W;
      let y = PAD.top + (1 - yPct) * PLOT_H;
      const r = Math.max(
        10,
        Math.min(34, Math.sqrt(item.revenue / maxRev) * 33),
      );

      // 若與已放置氣泡中心極度接近（< 6px），沿黃金角微調 8px
      let collisionCount = 0;
      for (const prev of placed) {
        const dx = x - prev.x;
        const dy = y - prev.y;
        if (dx * dx + dy * dy < 36) collisionCount++;
      }
      if (collisionCount > 0) {
        const angle = collisionCount * 2.39996;
        const dist = 9 + collisionCount * 3;
        x = Math.min(
          PAD.left + PLOT_W - r,
          Math.max(PAD.left + r, x + Math.cos(angle) * dist),
        );
        y = Math.min(
          PAD.top + PLOT_H - r,
          Math.max(PAD.top + r, y + Math.sin(angle) * dist),
        );
      }

      placed.push({ item, x, y, r });
    }
    return placed;
  }, [data, minMargin, maxMargin, maxQty, maxRev]);

  // 柏拉圖前 14 名
  const paretoItems = useMemo(() => data.slice(0, 14), [data]);
  const paretoMaxBasis = Math.max(1, ...paretoItems.map((i) => i.basisValue));

  const activeZoneLabel = useMemo(() => {
    if (!zoneFilter) return null;
    const [xb, yb] = zoneFilter.split("-").map(Number);
    return ZONE_LABELS[yb as 0 | 1 | 2]?.[xb as 0 | 1 | 2] ?? null;
  }, [zoneFilter]);

  function updateTooltipFromEvent(e: React.MouseEvent<SVGGElement>) {
    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  function downloadCsv() {
    const rows = [
      [
        "ABC",
        "排名",
        "商品名稱",
        "分類",
        "九宮格定位",
        "近期趨勢%",
        "健康度",
        "熱門時段",
        "銷售量",
        "商品營收",
        `${BASIS_META[basis].label}占比%`,
        "累計占比%",
        "毛利率%",
        "策略建議",
      ],
      ...displayed.map((p) => [
        p.abc,
        p.rank,
        p.name,
        p.category,
        p.zoneLabel,
        p.momentumPct != null ? p.momentumPct.toFixed(0) : "",
        p.healthScore,
        p.peakHour != null ? `${p.peakHour}:00` : "",
        p.salesQty,
        p.revenue,
        p.contributionPct.toFixed(1),
        p.cumulativePct.toFixed(1),
        p.marginPct != null ? p.marginPct.toFixed(1) : "",
        p.strategy,
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
    <div className="space-y-5 text-[#302b26]">
      {/* 頂部精簡控制列 */}
      <div className="rounded-2xl border border-[#e5d8c8] bg-white p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#6e6257]">分類基準</span>
            <div className="flex rounded-xl border border-[#e5d8c8] bg-[#faf6f0] p-1">
              {(["revenue", "profit", "sales"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBasis(b)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    basis === b
                      ? "bg-[#935941] text-white shadow-2xs"
                      : "text-[#675b4f] hover:text-[#302b26]"
                  }`}
                >
                  {BASIS_META[b].label}
                </button>
              ))}
            </div>

            <span className="ml-1 text-xs font-bold text-[#6e6257]">期間</span>
            <div className="flex rounded-xl border border-[#e5d8c8] bg-[#faf6f0] p-1">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDaysChange(d)}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold transition-all ${
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

        {/* A / B 門檻控制列 */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[#f0e6da] pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#5e5043]">
            <SlidersHorizontal size={14} className="text-[#935941]" />
            A / B 門檻
          </span>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setACut(70);
                setBCut(90);
              }}
              className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                aCut === 70 && bCut === 90
                  ? "border-[#4e6752] bg-[#eff5f0] text-[#4e6752]"
                  : "border-[#e5d8c8] text-[#6e6257] hover:border-[#c8b6a2]"
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
              className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                aCut === 80 && bCut === 95
                  ? "border-[#4e6752] bg-[#eff5f0] text-[#4e6752]"
                  : "border-[#e5d8c8] text-[#6e6257] hover:border-[#c8b6a2]"
              }`}
            >
              80 / 95
            </button>
          </div>

          <label className="flex min-w-[160px] flex-1 items-center gap-2.5">
            <span className="shrink-0 font-bold text-[#4e6752]">
              A 類 ≤ {aCut}%
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
              className="h-1.5 flex-1 cursor-pointer accent-[#4e6752]"
            />
          </label>

          <label className="flex min-w-[160px] flex-1 items-center gap-2.5">
            <span className="shrink-0 font-bold text-[#b8823c]">
              B 類 ≤ {bCut}%
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

      {/* A / B / C 三張摘要卡（對齊 POS 風格並可點擊篩選） */}
      <div className="grid gap-4 md:grid-cols-3">
        {classStats.map((stat) => {
          const st = CLASS_STYLE[stat.cls];
          const active = abcFilter === stat.cls;
          const rangeText =
            stat.cls === "A"
              ? `佔前 ${aCut}%`
              : stat.cls === "B"
                ? `佔 ${aCut}–${bCut}%`
                : `其餘 ${100 - bCut}%`;
          return (
            <motion.button
              key={stat.cls}
              type="button"
              whileHover={{ y: -2 }}
              onClick={() =>
                setAbcFilter((prev) => (prev === stat.cls ? "ALL" : stat.cls))
              }
              style={{
                borderLeftColor: st.color,
                borderLeftWidth: 4,
                backgroundColor: active ? st.softBg : "#ffffff",
                borderColor: active ? st.color : "#e5d8c8",
              }}
              className="rounded-2xl border p-5 text-left shadow-2xs transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-7 items-center justify-center rounded-lg font-mono text-sm font-black text-white"
                    style={{ backgroundColor: st.color }}
                  >
                    {stat.cls}
                  </span>
                  <strong className="text-base font-bold text-[#302b26]">
                    {st.label}
                  </strong>
                </div>
                <span className="rounded-full bg-[#faf6f0] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#75675a]">
                  {rangeText}
                </span>
              </div>

              <div className="mt-3.5 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-mono text-3xl font-black"
                    style={{ color: st.color }}
                  >
                    {stat.count}
                  </span>
                  <span className="text-xs font-bold text-[#8a7c6e]">
                    種（{stat.countPct.toFixed(0)}%）
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-sm font-bold text-[#302b26]">
                    {BASIS_META[basis].format(stat.basisSum)}
                  </span>
                  <span className="font-mono text-[11px] text-[#7a6d60]">
                    佔 {stat.basisPct.toFixed(1)}% · 均毛利{" "}
                    {stat.avgMargin == null ? "—" : `${stat.avgMargin.toFixed(1)}%`}
                  </span>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0e8de]">
                <motion.div
                  animate={{ width: `${stat.basisPct}%` }}
                  transition={{ duration: 0.45 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: st.color }}
                />
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
          {/* 主視覺區：POS 同款九宮格分布圖（支援一鍵切柏拉圖） ＋ 右側單品診斷卡 */}
          <div className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
            <section className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs">
              {/* 圖表頁首 */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6da] pb-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-sm font-bold text-[#302b26]">
                    {viewMode === "grid"
                      ? "商品九宮格分布圖"
                      : `柏拉圖累積曲線（Top ${paretoItems.length}）`}
                  </h3>
                  {activeZoneLabel && viewMode === "grid" && (
                    <button
                      type="button"
                      onClick={() => setZoneFilter(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#935941]/30 bg-[#fdf3ec] px-2.5 py-0.5 text-[11px] font-bold text-[#935941] hover:bg-[#f9e5d7]"
                    >
                      分區：{activeZoneLabel}
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {viewMode === "grid" && (
                    <button
                      type="button"
                      onClick={() => setZoomX((v) => !v)}
                      title="切換橫軸為標準 0–100% 或自動展開至實際毛利區間"
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        zoomX
                          ? "border-[#935941] bg-[#fdf3ec] text-[#935941]"
                          : "border-[#e5d8c8] bg-[#faf6f0] text-[#6b5e51] hover:text-[#302b26]"
                      }`}
                    >
                      {zoomX ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                      {zoomX
                        ? `毛利 ${minMargin}–${maxMargin}%`
                        : "展開毛利軸"}
                    </button>
                  )}

                  <div className="flex rounded-lg border border-[#e5d8c8] bg-[#faf6f0] p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                        viewMode === "grid"
                          ? "bg-[#302b26] text-white"
                          : "text-[#6e6257] hover:text-[#302b26]"
                      }`}
                    >
                      <Grid3X3 size={12} />
                      九宮格
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("pareto")}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                        viewMode === "pareto"
                          ? "bg-[#302b26] text-white"
                          : "text-[#6e6257] hover:text-[#302b26]"
                      }`}
                    >
                      <BarChart3 size={12} />
                      柏拉圖
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === "grid" ? (
                /* ─── POS 同款優化版：3×3 九宮格氣泡視覺圖 ─── */
                <div
                  ref={chartContainerRef}
                  className="relative mt-4 overflow-x-auto"
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setTooltipPos(null);
                  }}
                >
                  <svg
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    className="w-full min-w-[560px] select-none"
                    role="img"
                    aria-label="商品 ABC 九宮格分布圖"
                  >
                    {/* 九宮格底色、標籤、商品數與點擊篩選區 */}
                    {[0, 1, 2].map((yi) =>
                      [0, 1, 2].map((xi) => {
                        const zx = PAD.left + xi * (PLOT_W / 3);
                        const zy = PAD.top + (2 - yi) * (PLOT_H / 3);
                        const zKey = `${xi}-${yi}`;
                        const zLabel = ZONE_LABELS[yi as 0 | 1 | 2][xi as 0 | 1 | 2];
                        const count = zoneCounts[zKey] ?? 0;
                        const isZoneActive = zoneFilter === zKey;

                        return (
                          <g
                            key={`zone-${zKey}`}
                            className="cursor-pointer"
                            onClick={() =>
                              setZoneFilter((prev) =>
                                prev === zKey ? null : zKey,
                              )
                            }
                          >
                            <rect
                              x={zx}
                              y={zy}
                              width={PLOT_W / 3}
                              height={PLOT_H / 3}
                              fill={ZONE_FILLS[yi as 0 | 1 | 2][xi as 0 | 1 | 2]}
                              stroke={isZoneActive ? "#935941" : "#e6dacb"}
                              strokeWidth={isZoneActive ? 2 : 1}
                              opacity={
                                zoneFilter && !isZoneActive ? 0.35 : 1
                              }
                            />
                            <text
                              x={zx + 10}
                              y={zy + 19}
                              fill={isZoneActive ? "#935941" : "#6c5f53"}
                              fontSize="11"
                              fontWeight="800"
                              opacity={isZoneActive ? 1 : 0.78}
                            >
                              {zLabel}
                            </text>
                            {count > 0 && (
                              <text
                                x={zx + PLOT_W / 3 - 10}
                                y={zy + 19}
                                textAnchor="end"
                                fill="#8a7c6e"
                                fontSize="10"
                                fontFamily="monospace"
                                fontWeight="700"
                              >
                                {count} 款
                              </text>
                            )}
                          </g>
                        );
                      }),
                    )}

                    {/* 外框線 */}
                    <rect
                      x={PAD.left}
                      y={PAD.top}
                      width={PLOT_W}
                      height={PLOT_H}
                      fill="none"
                      stroke="#d5c6b3"
                      strokeWidth="1.2"
                    />

                    {/* X 軸分區標籤與刻度 */}
                    {["低毛利", "中毛利", "高毛利"].map((label, i) => {
                      const low = Math.round(
                        minMargin + (i * (maxMargin - minMargin)) / 3,
                      );
                      const high = Math.round(
                        minMargin + ((i + 1) * (maxMargin - minMargin)) / 3,
                      );
                      return (
                        <text
                          key={label}
                          x={PAD.left + (i + 0.5) * (PLOT_W / 3)}
                          y={SVG_H - 26}
                          fill="#6b5e51"
                          fontSize="11"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {label}（{low}–{high}%）
                        </text>
                      );
                    })}

                    {/* Y 軸標籤 */}
                    {["低銷量", "中銷量", "高銷量"].map((label, i) => (
                      <text
                        key={label}
                        x={PAD.left - 10}
                        y={PAD.top + (2.5 - i) * (PLOT_H / 3)}
                        fill="#6b5e51"
                        fontSize="10.5"
                        fontWeight="700"
                        textAnchor="end"
                        dominantBaseline="middle"
                      >
                        {label}
                      </text>
                    ))}

                    {/* 軸標題 */}
                    <text
                      x={PAD.left + PLOT_W / 2}
                      y={SVG_H - 7}
                      fill="#8a7c6e"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      毛利率 →（氣泡面積：銷售金額）
                    </text>

                    {/* 商品氣泡 */}
                    {bubbles.map(({ item, x, y, r }) => {
                      const isSelected = selected?.productId === item.productId;
                      const isHovered = hoveredId === item.productId;
                      const matchesFilters =
                        (abcFilter === "ALL" || item.abc === abcFilter) &&
                        (!zoneFilter || item.zoneKey === zoneFilter);
                      const noCost = item.marginPct === null;
                      const fillColor = noCost
                        ? "#9e9286"
                        : CLASS_STYLE[item.abc].color;
                      const strokeColor = CLASS_STYLE[item.abc].color;
                      const dimmed =
                        !matchesFilters || (hoveredId !== null && !isHovered);

                      return (
                        <g
                          key={item.productId}
                          className="cursor-pointer"
                          onMouseEnter={(e) => {
                            setHoveredId(item.productId);
                            updateTooltipFromEvent(e);
                          }}
                          onMouseMove={updateTooltipFromEvent}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.productId);
                          }}
                        >
                          {/* 選中高亮外圈 */}
                          {(isSelected || isHovered) && (
                            <circle
                              cx={x}
                              cy={y}
                              r={r + 5}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="2"
                              strokeDasharray="4 3"
                              opacity={0.75}
                            />
                          )}

                          <motion.circle
                            cx={x}
                            cy={y}
                            initial={false}
                            animate={{
                              r: isHovered ? r + 2.5 : r,
                              fillOpacity: dimmed
                                ? 0.16
                                : noCost
                                  ? 0.22
                                  : isHovered || isSelected
                                    ? 0.94
                                    : 0.76,
                            }}
                            transition={{ duration: 0.18 }}
                            fill={fillColor}
                            stroke={isSelected ? "#302b26" : strokeColor}
                            strokeWidth={
                              isSelected ? 2.4 : isHovered ? 2 : noCost ? 1.4 : 1.2
                            }
                            strokeDasharray={noCost ? "4 2.5" : "none"}
                          />

                          {r >= 17 && !dimmed && (
                            <text
                              x={x}
                              y={y + 1}
                              fill={noCost ? "#52473d" : "#ffffff"}
                              fontSize={r >= 24 ? "9.5" : "8"}
                              fontWeight="800"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ pointerEvents: "none" }}
                            >
                              {item.name.length > 5
                                ? `${item.name.slice(0, 4)}…`
                                : item.name}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* 精緻 HTML 懸浮提示卡（自動避邊） */}
                  <AnimatePresence>
                    {hoveredProduct && tooltipPos && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          left:
                            tooltipPos.x >
                            (chartContainerRef.current?.clientWidth ?? 600) - 240
                              ? Math.max(8, tooltipPos.x - 235)
                              : tooltipPos.x + 16,
                          top: Math.max(8, tooltipPos.y - 96),
                        }}
                        className="pointer-events-none absolute z-20 w-[220px] rounded-xl border border-[#dfd0be] bg-white/95 p-3 shadow-lg backdrop-blur-xs"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-black text-white"
                            style={{
                              backgroundColor:
                                CLASS_STYLE[hoveredProduct.abc].color,
                            }}
                          >
                            {hoveredProduct.abc} 類
                          </span>
                          <span className="text-[10px] font-bold text-[#75675a]">
                            {hoveredProduct.zoneLabel}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-1 text-xs font-bold text-[#302b26]">
                          {hoveredProduct.name}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-[#f0e6da] pt-2 font-mono text-[11px]">
                          <span className="text-[#7c6f63]">銷量</span>
                          <span className="text-right font-bold text-[#302b26]">
                            {hoveredProduct.salesQty} 件
                          </span>
                          <span className="text-[#7c6f63]">營收</span>
                          <span className="text-right font-bold text-[#302b26]">
                            {money(hoveredProduct.revenue)}
                          </span>
                          <span className="text-[#7c6f63]">佔比</span>
                          <span className="text-right font-bold text-[#302b26]">
                            {hoveredProduct.contributionPct.toFixed(1)}%
                          </span>
                          <span className="text-[#7c6f63]">毛利率</span>
                          <span className="text-right font-bold text-[#302b26]">
                            {hoveredProduct.marginPct != null
                              ? `${hoveredProduct.marginPct.toFixed(1)}%`
                              : "未設成本"}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 底部圖例 */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#f3ebe1] pt-3 text-[11px] font-bold text-[#6e6257]">
                    <div className="flex flex-wrap items-center gap-4">
                      {(["A", "B", "C"] as const).map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() =>
                            setAbcFilter((prev) =>
                              prev === cls ? "ALL" : cls,
                            )
                          }
                          className={`inline-flex items-center gap-1.5 transition-opacity ${
                            abcFilter !== "ALL" && abcFilter !== cls
                              ? "opacity-40"
                              : "opacity-100"
                          }`}
                        >
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: CLASS_STYLE[cls].color }}
                          />
                          {cls} 類（{CLASS_STYLE[cls].label}）
                        </button>
                      ))}
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-3 rounded-full border border-dashed border-[#8a7c6e] bg-[#9e9286]/20" />
                        無成本資料
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#8a7c6e]">
                      點擊格子可篩選分區 · 點擊氣泡查看診斷
                    </span>
                  </div>
                </div>
              ) : (
                /* ─── 輔助視角：柏拉圖雙軸累積曲線 ─── */
                <div className="mt-4 overflow-x-auto">
                  <svg
                    viewBox="0 0 740 310"
                    className="w-full min-w-[540px] select-none"
                    role="img"
                    aria-label="商品 ABC 柏拉圖累積曲線"
                  >
                    {[0, 25, 50, 75, 100].map((pct) => {
                      const y = 250 - (pct / 100) * 215;
                      return (
                        <g key={pct}>
                          <line
                            x1="44"
                            y1={y}
                            x2="692"
                            y2={y}
                            stroke="#f0e7dc"
                            strokeWidth="1"
                          />
                          <text
                            x="698"
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

                    {/* A / B 動態門檻虛線 */}
                    {(() => {
                      const yA = 250 - (aCut / 100) * 215;
                      const yB = 250 - (bCut / 100) * 215;
                      return (
                        <>
                          <line
                            x1="44"
                            y1={yA}
                            x2="692"
                            y2={yA}
                            stroke="#4e6752"
                            strokeWidth="1.5"
                            strokeDasharray="5 4"
                          />
                          <text
                            x="48"
                            y={yA - 4}
                            fill="#4e6752"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            A 線 {aCut}%
                          </text>
                          <line
                            x1="44"
                            y1={yB}
                            x2="692"
                            y2={yB}
                            stroke="#b8823c"
                            strokeWidth="1.5"
                            strokeDasharray="5 4"
                          />
                          <text
                            x="114"
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

                    {paretoItems.map((item, idx) => {
                      const stepW = 636 / Math.max(1, paretoItems.length);
                      const barW = Math.min(34, stepW * 0.62);
                      const cx = 52 + idx * stepW + stepW / 2;
                      const barH = Math.max(
                        4,
                        (item.basisValue / paretoMaxBasis) * 205,
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
                            y={250 - barH}
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
                            y="269"
                            textAnchor="middle"
                            fill={isActive ? "#935941" : "#6e6257"}
                            fontSize="9.5"
                            fontWeight={isActive ? "bold" : "normal"}
                          >
                            #{item.rank}
                          </text>
                          <text
                            x={cx}
                            y="286"
                            textAnchor="middle"
                            fill="#8a7c6e"
                            fontSize="8.5"
                          >
                            {item.name.slice(0, 4)}
                          </text>
                        </g>
                      );
                    })}

                    {paretoItems.length > 0 && (
                      <>
                        <polyline
                          fill="none"
                          stroke="#302b26"
                          strokeWidth="2.2"
                          points={paretoItems
                            .map((item, idx) => {
                              const stepW = 636 / Math.max(1, paretoItems.length);
                              const cx = 52 + idx * stepW + stepW / 2;
                              const cy = 250 - (item.cumulativePct / 100) * 215;
                              return `${cx},${cy}`;
                            })
                            .join(" ")}
                        />
                        {paretoItems.map((item, idx) => {
                          const stepW = 636 / Math.max(1, paretoItems.length);
                          const cx = 52 + idx * stepW + stepW / 2;
                          const cy = 250 - (item.cumulativePct / 100) * 215;
                          const isActive =
                            selected?.productId === item.productId;
                          return (
                            <circle
                              key={`pt-${item.productId}`}
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
              )}
            </section>

            {/* 右側單品策略診斷卡（與九宮格／柏拉圖／表格即時連動） */}
            {selected && (
              <aside className="flex flex-col justify-between rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2 border-b border-[#f0e6da] pb-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-md px-2 py-0.5 font-mono text-[11px] font-black text-white"
                          style={{
                            backgroundColor: CLASS_STYLE[selected.abc].color,
                          }}
                        >
                          {selected.abc} 類 #{selected.rank}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                            ZONE_BADGE_STYLE[selected.zoneLabel] ??
                            "bg-[#faf6f0] text-[#5e5246] border-[#e5d8c8]"
                          }`}
                        >
                          {selected.zoneLabel}
                        </span>
                      </div>
                      <h4 className="mt-2 text-base font-bold leading-snug text-[#302b26]">
                        {selected.name}
                      </h4>
                      <p className="mt-0.5 text-xs text-[#7c6f63]">
                        {selected.category} ·{" "}
                        {PET_LABELS[selected.petType] ?? selected.petType}
                      </p>
                    </div>
                  </div>

                  {/* 四項關鍵數值 */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-[#efe5d8] bg-[#faf6f0] p-3">
                      <span className="text-[11px] font-semibold text-[#7a6d60]">
                        期間營收（佔比）
                      </span>
                      <p className="mt-1 font-mono text-base font-bold text-[#302b26]">
                        {money(selected.revenue)}
                      </p>
                      <span className="font-mono text-[11px] text-[#7a6d60]">
                        {selected.contributionPct.toFixed(1)}% · 累計{" "}
                        {selected.cumulativePct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="rounded-xl border border-[#efe5d8] bg-[#faf6f0] p-3">
                      <span className="text-[11px] font-semibold text-[#7a6d60]">
                        銷售量（均價）
                      </span>
                      <p className="mt-1 font-mono text-base font-bold text-[#302b26]">
                        {selected.salesQty.toLocaleString()} 件
                      </p>
                      <span className="font-mono text-[11px] text-[#7a6d60]">
                        均價 {money(selected.avgUnitPrice)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-[#efe5d8] bg-[#faf6f0] p-3">
                      <span className="text-[11px] font-semibold text-[#7a6d60]">
                        毛利率（毛利額）
                      </span>
                      <p
                        className="mt-1 font-mono text-base font-bold"
                        style={{
                          color:
                            selected.marginPct == null
                              ? "#8a7c6e"
                              : selected.marginPct >= 55
                                ? "#4e6752"
                                : selected.marginPct >= 35
                                  ? "#b8823c"
                                  : "#9b3d28",
                        }}
                      >
                        {selected.marginPct != null
                          ? `${selected.marginPct.toFixed(1)}%`
                          : "未設成本"}
                      </p>
                      <span className="font-mono text-[11px] text-[#7a6d60]">
                        {selected.grossProfitNt != null
                          ? money(selected.grossProfitNt)
                          : "—"}
                        {selected.estimatedCost ? "（估算）" : ""}
                      </span>
                    </div>

                    <div className="rounded-xl border border-[#efe5d8] bg-[#faf6f0] p-3">
                      <span className="text-[11px] font-semibold text-[#7a6d60]">
                        近 7 日銷量趨勢
                      </span>
                      <p className="mt-1 flex items-center gap-1 font-mono text-base font-bold">
                        {selected.momentumPct == null ? (
                          <span className="text-[#8a7c6e]">持平</span>
                        ) : selected.momentumPct >= 0 ? (
                          <span className="inline-flex items-center text-[#4e6752]">
                            <ArrowUpRight size={16} />+
                            {Math.round(selected.momentumPct)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[#9b3d28]">
                            <ArrowDownRight size={16} />
                            {Math.round(selected.momentumPct)}%
                          </span>
                        )}
                      </p>
                      <span className="font-mono text-[11px] text-[#7a6d60]">
                        近 7 天 {selected.qtyRecent} / 前期 {selected.qtyPrior}
                      </span>
                    </div>
                  </div>

                  {/* 健康度儀表條 + 熱門時段 + 共購搭檔 */}
                  <div className="space-y-2.5 rounded-xl border border-[#efe5d8] bg-[#fcfaf6] p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#5e5246]">綜合健康度</span>
                      <span className="font-mono font-black text-[#302b26]">
                        {selected.healthScore} / 100
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#ece3d7]">
                      <motion.div
                        animate={{ width: `${selected.healthScore}%` }}
                        transition={{ duration: 0.35 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            selected.healthScore >= 75
                              ? "#4e6752"
                              : selected.healthScore >= 45
                                ? "#b8823c"
                                : "#9b3d28",
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-[#6d6054]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-[#935941]" />
                        熱門時段：
                        <strong className="font-mono text-[#302b26]">
                          {selected.peakHour != null
                            ? `${String(selected.peakHour).padStart(2, "0")}:00`
                            : "—"}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Link2 size={12} className="text-[#4e6752]" />
                        常共購：
                        <strong className="text-[#302b26]">
                          {selected.bestPair ?? "尚無明顯組合"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* 策略建議 */}
                  <div className="rounded-xl border border-[#e7d6c3] bg-[#fdf8f2] p-3.5">
                    <p className="text-[11px] font-bold text-[#935941]">
                      營運策略建議
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#473d34]">
                      {selected.strategy}
                    </p>
                  </div>
                </div>

                {/* 快捷動作 */}
                <div className="mt-4 flex gap-2 border-t border-[#f0e6da] pt-3.5">
                  <Link
                    href="/admin/products"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#dfd0be] bg-[#faf6f0] py-2 text-xs font-bold text-[#5e4d3f] transition-colors hover:border-[#935941] hover:text-[#935941]"
                  >
                    商品管理
                    <ExternalLink size={12} />
                  </Link>
                  <Link
                    href="/admin/inventory"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#935941] py-2 text-xs font-bold text-white transition-colors hover:bg-[#7d4934]"
                  >
                    庫存與成本
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </aside>
            )}
          </div>

          {/* 底部商品分類明細表（對齊 POS 欄位並支援點擊連動） */}
          <section className="overflow-hidden rounded-2xl border border-[#e5d8c8] bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6da] p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#302b26]">
                  商品分類明細
                </h3>
                <span className="rounded-full bg-[#faf6f0] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#75675a]">
                  {displayed.length} / {data.length} 項
                </span>
                {(abcFilter !== "ALL" || zoneFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbcFilter("ALL");
                      setZoneFilter(null);
                    }}
                    className="text-xs font-bold text-[#935941] hover:underline"
                  >
                    重設篩選
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9b8d80]"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜尋商品..."
                    className="h-9 w-44 rounded-xl border border-[#e5d8c8] bg-[#faf6f0] pl-8 pr-3 text-xs outline-none focus:border-[#935941]"
                  />
                </label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 rounded-xl border border-[#e5d8c8] bg-[#faf6f0] px-3 text-xs font-semibold text-[#52473d] outline-none focus:border-[#935941]"
                >
                  <option value="ALL">全部分類</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={petType}
                  onChange={(e) => setPetType(e.target.value)}
                  className="h-9 rounded-xl border border-[#e5d8c8] bg-[#faf6f0] px-3 text-xs font-semibold text-[#52473d] outline-none focus:border-[#935941]"
                >
                  <option value="ALL">全部對象</option>
                  {Object.entries(PET_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value as "rank" | "margin" | "sales" | "health",
                    )
                  }
                  className="h-9 rounded-xl border border-[#e5d8c8] bg-[#faf6f0] px-3 text-xs font-semibold text-[#52473d] outline-none focus:border-[#935941]"
                >
                  <option value="rank">依 ABC 排名</option>
                  <option value="margin">依毛利率高到低</option>
                  <option value="sales">依銷售量高到低</option>
                  <option value="health">依健康度高到低</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf6f0] text-[11px] font-bold text-[#75675a]">
                  <tr className="border-b border-[#ece1d4]">
                    <th className="px-4 py-3">分類</th>
                    <th className="px-4 py-3">商品名稱</th>
                    <th className="px-4 py-3">九宮格定位</th>
                    <th className="px-4 py-3">近期趨勢</th>
                    <th className="px-4 py-3">健康度</th>
                    <th className="px-4 py-3">熱門時段</th>
                    <th className="px-4 py-3 text-right">銷售量</th>
                    <th className="px-4 py-3 text-right">貢獻金額</th>
                    <th className="px-4 py-3 text-right">毛利率</th>
                    <th className="px-4 py-3">策略建議</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2e9de]">
                  {displayed.map((p) => {
                    const isSelected = selected?.productId === p.productId;
                    const st = CLASS_STYLE[p.abc];
                    return (
                      <tr
                        key={p.productId}
                        onClick={() => setSelectedId(p.productId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#fdf5ec]"
                            : "hover:bg-[#faf6f0]/80"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex size-7 items-center justify-center rounded-lg font-mono text-[11px] font-black"
                            style={{
                              backgroundColor: st.softBg,
                              color: st.color,
                              border: `1px solid ${st.border}`,
                            }}
                          >
                            {p.abc}
                          </span>
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <p className="truncate font-bold text-[#302b26]">
                            {p.name}
                          </p>
                          <span className="text-[10px] text-[#8a7c6e]">
                            {p.category} · {PET_LABELS[p.petType] ?? p.petType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                              ZONE_BADGE_STYLE[p.zoneLabel] ??
                              "bg-[#faf6f0] text-[#5e5246] border-[#e5d8c8]"
                            }`}
                          >
                            {p.zoneLabel}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-bold">
                          {p.velocity > 0.1 ? (
                            <span className="text-[#4e6752]">
                              ↑ {Math.round(p.velocity * 100)}%
                            </span>
                          ) : p.velocity < -0.1 ? (
                            <span className="text-[#9b3d28]">
                              ↓ {Math.abs(Math.round(p.velocity * 100))}%
                            </span>
                          ) : (
                            <span className="text-[#9b8d80]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#ece3d7]">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${p.healthScore}%`,
                                  backgroundColor:
                                    p.healthScore >= 75
                                      ? "#4e6752"
                                      : p.healthScore >= 45
                                        ? "#b8823c"
                                        : "#9b3d28",
                                }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-[#6e6257]">
                              {p.healthScore}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded bg-[#f5efe6] px-2 py-0.5 font-mono text-[11px] font-bold text-[#5e5246]">
                            {p.peakHour != null
                              ? `${String(p.peakHour).padStart(2, "0")}:00`
                              : "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-[#52473d]">
                          {p.salesQty.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                          <span
                            className="font-bold"
                            style={{ color: st.color }}
                          >
                            {money(p.revenue)}
                          </span>
                          <span className="block text-[10px] text-[#8a7c6e]">
                            {p.contributionPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold">
                          {p.marginPct != null ? (
                            <span
                              style={{
                                color:
                                  p.marginPct >= 55
                                    ? "#4e6752"
                                    : p.marginPct >= 35
                                      ? "#b8823c"
                                      : "#9b3d28",
                              }}
                            >
                              {p.marginPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#9b8d80]">—</span>
                          )}
                        </td>
                        <td className="min-w-[240px] max-w-[320px] px-4 py-3 text-[11px] leading-relaxed text-[#5c5045]">
                          {p.strategy}
                        </td>
                      </tr>
                    );
                  })}
                  {displayed.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-10 text-center text-xs text-[#8a7c6e]"
                      >
                        無符合篩選條件的商品
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
