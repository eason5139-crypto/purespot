"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Ruler, ScanEye, ShieldCheck } from "lucide-react";
import type { Product } from "@/lib/types";
import { NtdCoinSvg } from "@/components/ui/CraftEmblems";

interface MacroKibbleViewerProps {
  product?: Product;
  compact?: boolean;
}

/**
 * 互動式食材剖面與微距檢視器
 */
export function MacroKibbleViewer({
  product,
  compact = false,
}: MacroKibbleViewerProps) {
  const [mode, setMode] = useState<"cross-section" | "scale">("cross-section");
  const [splitProgress, setSplitProgress] = useState<number>(68);
  const [loupeCoords, setLoupeCoords] = useState<{ x: number; y: number } | null>(
    null,
  );

  const isSupply = product?.kind === "SUPPLIES";
  const proteinMin = product?.proteinMin ?? 36;
  const kcalPer100g = product?.kcalPer100g ?? 395;
  const moistureMax = product?.moistureMax ?? 10;
  const ingredients = product?.ingredients ?? [
    "去骨野生鮭魚",
    "台灣在地鮮雞肉",
    "冷壓深海魚油",
    "菊苣根益生元",
  ];

  // 依據滑桿數值計算三層剖面的展開位移
  const layerOffset = (splitProgress / 100) * (compact ? 22 : 34);
  const stageLabel =
    splitProgress < 30
      ? "表面烘焙微距（低溫防潮保護表層）"
      : splitProgress < 75
        ? "雙倍縱向剖面（氣孔疏鬆度與肉纖組織）"
        : "三層營養結構完整展開";

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setLoupeCoords({ x, y });
  }

  return (
    <div className="craft-letterpress rounded-[1.6rem] bg-[#fffdf8] p-5 text-[#302b26] shadow-[0_10px_30px_-18px_rgba(110,72,48,0.2)]">
      {/* 標題與雙模式切換 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5d8c8] pb-3.5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#935941] uppercase">
            CRAFT INSPECTION · 材質微距與結構透視
          </p>
          <h3 className="editorial-title mt-0.5 text-lg font-bold text-[#2c241d]">
            {isSupply
              ? "生活道具材質拆解與實寸比例對照"
              : "顆粒微距剖面檢視與 20mm 實物比例尺"}
          </h3>
        </div>

        <div
          className="inline-flex rounded-xl border border-[#dfd1c0] bg-[#f6efe5] p-1"
          role="tablist"
          aria-label="檢視模式切換"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "cross-section"}
            onClick={() => setMode("cross-section")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              mode === "cross-section"
                ? "bg-[#935941] text-white shadow-xs"
                : "text-[#67594c] hover:text-[#302b26]"
            }`}
          >
            <Layers size={13} />
            剖面結構拆解
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "scale"}
            onClick={() => setMode("scale")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              mode === "scale"
                ? "bg-[#935941] text-white shadow-xs"
                : "text-[#67594c] hover:text-[#302b26]"
            }`}
          >
            <Ruler size={13} />
            20mm 實寸比例
          </button>
        </div>
      </div>

      {mode === "cross-section" ? (
        <div className="mt-4">
          {/* 互動微距展示窗 */}
          <div
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setLoupeCoords(null)}
            className={`relative overflow-hidden rounded-2xl border border-[#e3d5c3] bg-[radial-gradient(circle_at_50%_35%,#fffaf2_0%,#f1e6d6_100%)] p-5 ${
              compact ? "min-h-[210px]" : "min-h-[250px]"
            }`}
          >
            {/* 細密製圖網格背景 */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(147,89,65,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,89,65,0.12) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* 左上角放大鏡即時座標刻度 */}
            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-[#7d6854]">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#fffdf8]/90 px-2.5 py-1 border border-[#dfd0be]">
                <ScanEye size={13} className="text-[#935941]" />
                {stageLabel}
              </span>
              <span className="hidden rounded-md bg-[#fffdf8]/90 px-2 py-1 border border-[#dfd0be] sm:inline-block">
                {loupeCoords
                  ? `X:${loupeCoords.x} Y:${loupeCoords.y} · 4.5x LOUPE`
                  : "將指標移入視窗檢視微距刻度"}
              </span>
            </div>

            {/* 三層剖面結構立體圖 */}
            <div className="relative z-10 mt-5 grid items-center gap-6 md:grid-cols-[0.95fr_1.05fr]">
              <div className="relative flex h-40 items-center justify-center">
                {/* 第三層：核心營養 */}
                <motion.div
                  animate={{ y: layerOffset }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="absolute flex h-14 w-36 items-center justify-center rounded-full border-2 border-[#b57b3c] bg-[linear-gradient(135deg,#f6d699_0%,#d49144_100%)] shadow-[0_8px_18px_rgba(165,105,35,0.28)]"
                >
                  <span className="font-mono text-[11px] font-bold text-[#4a2b0d]">
                    {isSupply ? "核心支撐結構" : `${kcalPer100g} kcal 核心`}
                  </span>
                </motion.div>

                {/* 第二層：中層纖維與粗蛋白 */}
                <motion.div
                  animate={{ y: 0, scale: 1 + (splitProgress / 100) * 0.05 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="relative z-10 flex h-16 w-44 items-center justify-center rounded-full border-2 border-[#7b432c] bg-[linear-gradient(135deg,#b56b4d_0%,#87452d_100%)] shadow-[0_10px_22px_rgba(120,60,35,0.3)]"
                >
                  <span className="text-xs font-bold tracking-wider text-[#fff7ef]">
                    {isSupply ? "高韌性主體材質" : `單一鮮肉層 ${proteinMin}%+`}
                  </span>
                </motion.div>

                {/* 第一層：低溫慢焙外殼 */}
                <motion.div
                  animate={{ y: -layerOffset }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="absolute z-20 flex h-14 w-40 items-center justify-center rounded-full border-2 border-[#d1b490] bg-[linear-gradient(135deg,#fff8ec_0%,#e2c8a6_100%)] shadow-[0_10px_20px_rgba(110,80,50,0.22)]"
                >
                  <span className="text-[11px] font-bold text-[#5e442c]">
                    {isSupply ? "圓潤抗磨表層" : `低溫鎖香膜 · 水分 <${moistureMax}%`}
                  </span>
                </motion.div>
              </div>

              {/* 三層數值與白話說明 */}
              <div className="space-y-2 text-xs">
                <div className="rounded-xl border border-[#e3d4c1] bg-[#fffdf9]/95 px-3 py-2">
                  <span className="font-mono text-[10px] font-bold text-[#935941]">
                    LAYER 01 · 表層結構
                  </span>
                  <p className="mt-0.5 font-medium text-[#3b3129]">
                    {isSupply
                      ? "導圓角手工修邊，降低居家空間碰撞與啃咬刮傷風險。"
                      : `低溫慢焙形成均勻微孔，不須人工噴油即可鎖住自然肉香，水分散失率低於 ${moistureMax}%。`}
                  </p>
                </div>
                <div className="rounded-xl border border-[#e3d4c1] bg-[#fffdf9]/95 px-3 py-2">
                  <span className="font-mono text-[10px] font-bold text-[#4e6752]">
                    LAYER 02 · 主體基底
                  </span>
                  <p className="mt-0.5 font-medium text-[#3b3129]">
                    {isSupply
                      ? `主選材：${ingredients.slice(0, 3).join("、")}，通過耐耗測試。`
                      : `以${ingredients[0] ?? "單一動物肉源"}為第一順位原料，提供 ${proteinMin}% 粗蛋白密度。`}
                  </p>
                </div>
                <div className="rounded-xl border border-[#e3d4c1] bg-[#fffdf9]/95 px-3 py-2">
                  <span className="font-mono text-[10px] font-bold text-[#9d6728]">
                    LAYER 03 · 核心機能
                  </span>
                  <p className="mt-0.5 font-medium text-[#3b3129]">
                    {isSupply
                      ? "易拆卸清潔構造，貼合台灣潮濕季節之衛生養護需求。"
                      : `包埋益生元與脂溶性營養微粒，熱量密度穩定維持於 ${kcalPer100g} 大卡 / 100g。`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 滑桿控制列 */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-[#e7dac9] bg-[#faf4eb] px-4 py-3">
            <label
              htmlFor="macro-split-range"
              className="text-xs font-bold text-[#6e523e] shrink-0"
            >
              拖曳拆解剖面深度
            </label>
            <input
              id="macro-split-range"
              type="range"
              min={0}
              max={100}
              value={splitProgress}
              onChange={(e) => setSplitProgress(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[#dfd0be] accent-[#935941]"
            />
            <span className="w-12 text-right font-mono text-xs font-bold text-[#935941]">
              {splitProgress}%
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* 20mm 壹圓硬幣比例尺 vs 顆粒比例與職人器皿 */}
          <div className="grid items-center gap-5 rounded-2xl border border-[#e3d5c3] bg-[#faf4eb] p-5 sm:grid-cols-[auto_1fr]">
            <div className="flex items-center justify-center gap-4 rounded-2xl border border-[#dfd0be] bg-[#fffdf9] px-5 py-4 shadow-2xs">
              <div className="flex flex-col items-center">
                <NtdCoinSvg size={44} />
                <span className="mt-1.5 font-mono text-[10px] font-bold text-[#7c6248]">
                  壹圓硬幣 20mm
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-[#b89f86]">:</span>
              <div className="flex flex-col items-center">
                <div className="flex size-11 items-center justify-center rounded-full border border-dashed border-[#c8b298] bg-[#faf5ed]">
                  <span
                    className="block size-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#a96244_0%,#6c3621_100%)] shadow-[0_2px_5px_rgba(90,40,20,0.35)]"
                    aria-hidden="true"
                  />
                </div>
                <span className="mt-1.5 font-mono text-[10px] font-bold text-[#7c6248]">
                  {isSupply ? "溫潤握感比例" : "約 9.5mm 適口徑"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#4e6752]">
                <ShieldCheck size={14} />
                <span>口腔咀嚼與吞嚥安全實測</span>
              </div>
              <p className="leading-6 text-[#5c4f43]">
                {isSupply
                  ? "符合台灣居家住宅尺度，邊角採雙重打磨工序，兼顧視覺美感與日常耐用度。"
                  : "厚度約 4.2mm 的扁圓微凹造型，兼顧酥脆口感與防噎安全，從幼齡到熟齡毛孩皆可輕鬆咀嚼。"}
              </p>
              {/* 黃銅刻度尺視覺 */}
              <div className="pt-1">
                <div className="flex justify-between font-mono text-[10px] text-[#8c7863]">
                  <span>0mm</span>
                  <span>10mm</span>
                  <span>20mm</span>
                  <span>30mm</span>
                </div>
                <div className="mt-1 h-2.5 w-full rounded-sm border border-[#c8b090] bg-[repeating-linear-gradient(to_right,#8c6c4a_0px,#8c6c4a_1px,transparent_1px,transparent_10px)]" />
              </div>
            </div>
          </div>

          {/* 適口性與保鮮實測進度條 */}
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            {[
              { label: "開袋自然肉香評比", pct: 94, color: "bg-[#935941]" },
              { label: "適口性實測完食率", pct: 91, color: "bg-[#4e6752]" },
              { label: "海島夾鏈鎖鮮度", pct: 96, color: "bg-[#b5813a]" },
            ].map((bar) => (
              <div
                key={bar.label}
                className="rounded-xl border border-[#e6d8c7] bg-[#fffdf9] p-3"
              >
                <div className="flex justify-between font-bold text-[#4e4238]">
                  <span>{bar.label}</span>
                  <span className="font-mono text-[#935941]">{bar.pct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efe5d8]">
                  <div
                    className={`h-full rounded-full ${bar.color}`}
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
