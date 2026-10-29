"use client";
import { useState, useRef } from "react";
import { Package } from "lucide-react";
import type { ABCProductData } from "@/lib/adminTypes";

// 大地色系 ABC 配色
const ABC_COLOR = { A: "#935941", B: "#5b7b63", C: "#8a7f75" } as const;

interface ABCProduct {
  productId: string;
  name: string;
  salesQty: number;
  revenue: number;
  revenuePct: number;
  cumulativePct: number;
  marginPct: null; // PURESPOT 無 BOM，統一為 null
  abc: "A" | "B" | "C";
  velocity: number;
  healthScore: number;
}

interface TooltipState {
  product: ABCProduct;
  x: number;
  y: number;
}

// 九宮格標籤 [yBand][xBand]（y:0=低 2=高, x:0=低 2=高）
const ZONE_LABELS: string[][] = [
  ["觀察淘汰", "低效商品", "穩定獲利"],
  ["一般潛力", "穩定成長", "精選主力"],
  ["快速走量", "明星商品", "核心之星"],
];

// 策略建議（PURESPOT 版，移除 bestPair/peakHour）
function getStrategy(p: ABCProduct, maxQty: number): string {
  const qtyRank = maxQty > 0 ? p.salesQty / maxQty : 0;
  const isTopQty = qtyRank > 0.65;
  const isMidQty = qtyRank > 0.3 && qtyRank <= 0.65;
  const isRising = p.velocity > 0.15;
  const isDeclining = p.velocity < -0.15;
  const isKeyRev = p.revenuePct > 8;

  if (p.abc === "A") {
    if (isTopQty && isKeyRev && isRising)
      return "核心主力商品持續成長——供應穩定是第一優先，可規劃組合優惠進一步提升客單價。";
    if (isTopQty && isKeyRev && isDeclining)
      return "主力商品出現下滑訊號，建議調查原因（缺貨？競品？）並優先補足庫存，避免流失回購顧客。";
    if (isTopQty && isKeyRev)
      return "高貢獻核心商品，維持供應穩定是首要任務。可搭配定期配優惠鎖定長期顧客。";
    if (isTopQty && isRising)
      return "銷量高且持續成長，是強化推廣的最佳時機——加入首頁精選、提升曝光位置。";
    if (isMidQty && isRising)
      return "成長中的 A 類商品，距離主力只差一步。建議加強推薦頁位置、搭配定期配折扣吸引回購。";
    if (isDeclining)
      return "A 類商品銷售下滑，需立即確認庫存與顧客反饋，找出問題點後快速修正。";
    return "穩定 A 類商品，維持現有策略並監控庫存水位，確保不斷貨。";
  }

  if (p.abc === "B") {
    if (isRising)
      return "B 類商品正在成長，有潛力晉升 A 類。建議適度增加推廣資源，觀察 4 週走勢。";
    if (isDeclining)
      return "B 類商品出現下滑，應在滑入 C 類前找出原因——可調整定價或進行促銷測試。";
    if (isMidQty)
      return "穩定中段商品，搭配套組活動或定期配優惠有機會帶動銷量提升。";
    return "穩定 B 類商品，持續觀察銷售走勢，任何持續下滑訊號就應提早行動。";
  }

  // C 類
  if (isRising)
    return "C 類商品但正在成長——這是被低估的潛力商品，給予適當曝光位置觀察 2 週，若持續成長則考慮推廣。";
  if (p.revenuePct > 3 && !isDeclining)
    return "C 類中貢獻不低，至今無明顯下滑——可能只是曝光不足。試試加入套組或加強商品頁描述。";
  if (isDeclining)
    return "C 類且持續下滑——設定明確 KPI（如 4 週內提升 20%），未達標則評估下架以釋放管理資源。";
  return "低貢獻 C 類商品，建議試行一次促銷測試，若無起色則評估調整陳列或下架。";
}

// SVG 尺寸常數
const PAD = { left: 60, right: 24, top: 28, bottom: 56 };
const W = 720;
const H = 380;
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

interface Props {
  rawData: ABCProductData[];
}

export function ProductABCChart({ rawData }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 前端計算 ABC 分類
  const totalRevenue = rawData.reduce((s, p) => s + p.revenue, 0);
  let cum = 0;
  const data: ABCProduct[] = rawData.map((p) => {
    const revenuePct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
    const abc: "A" | "B" | "C" = cum < 70 ? "A" : cum < 90 ? "B" : "C";
    cum += revenuePct;
    const velocity =
      p.qtyPrior > 0
        ? (p.qtyRecent - p.qtyPrior) / p.qtyPrior
        : p.qtyRecent > 0
          ? 1
          : 0;
    const healthScore = Math.min(
      100,
      Math.max(0, (velocity + 1) * 30 + (revenuePct / 10) * 20),
    );
    return {
      productId: p.productId,
      name: p.name,
      salesQty: p.salesQty,
      revenue: p.revenue,
      revenuePct,
      cumulativePct: cum,
      marginPct: null,
      abc,
      velocity,
      healthScore,
    };
  });

  const maxQty = Math.max(...data.map((p) => p.salesQty), 1);
  const maxRev = Math.max(...data.map((p) => p.revenue), 1);
  const counts = {
    A: data.filter((p) => p.abc === "A").length,
    B: data.filter((p) => p.abc === "B").length,
    C: data.filter((p) => p.abc === "C").length,
  };

  function getBubble(p: ABCProduct) {
    // 無 marginPct，改用 revenuePct 作為 X 軸（貢獻比例），salesQty 作為 Y 軸
    const xPct = Math.min(p.revenuePct / 20, 1); // 最高 20% 貢獻 → 滿軸
    const yPct = p.salesQty / maxQty;
    const x = PAD.left + xPct * PLOT_W;
    const y = PAD.top + (1 - yPct) * PLOT_H;
    const r = Math.max(8, Math.min(32, Math.sqrt(p.revenue / maxRev) * 32));
    return { x, y, r };
  }

  if (data.length === 0) {
    return (
      <div className="panel p-10 bg-white border border-[#e8ded3] shadow-sm rounded-2xl text-center">
        <Package size={40} className="mx-auto mb-3 text-[#8a7f75]" />
        <p className="text-sm font-semibold text-[#675e53]">尚無銷售資料</p>
        <p className="text-xs text-[#8a7f75] mt-1">
          建立訂單後系統將自動彙整商品結構分析。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ABC 摘要卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {(["A", "B", "C"] as const).map((cls) => {
          const labels = { A: "核心商品", B: "穩定商品", C: "觀察商品" };
          const desc = { A: "營收貢獻前 70%", B: "貢獻 70–90%", C: "其餘品項" };
          return (
            <div
              key={cls}
              className="panel p-5 bg-white border border-[#e8ded3] shadow-sm"
              style={{ borderLeftColor: ABC_COLOR[cls], borderLeftWidth: 4 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-lg font-black"
                  style={{ color: ABC_COLOR[cls] }}
                >
                  {cls}
                </span>
                <span className="text-sm font-semibold text-[#302b26]">
                  {labels[cls]}
                </span>
              </div>
              <p
                className="text-3xl font-bold font-mono"
                style={{ color: ABC_COLOR[cls] }}
              >
                {counts[cls]}
                <span className="text-sm ml-1 opacity-60 font-normal">種</span>
              </p>
              <p className="text-xs text-[#8a7f75] mt-1">{desc[cls]}</p>
            </div>
          );
        })}
      </div>

      {/* 散佈圖 */}
      <div className="panel p-6 bg-white border border-[#e8ded3] shadow-sm">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <p className="text-sm font-semibold text-[#302b26]">商品分布矩陣</p>
          <span className="text-xs text-[#8a7f75]">
            橫軸：貢獻佔比　縱軸：銷售數量　氣泡大小：銷售金額
          </span>
        </div>
        <div className="relative overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ maxHeight: 400 }}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* 九宮格背景 */}
            {[0, 1, 2].map((yi) =>
              [0, 1, 2].map((xi) => {
                const zx = PAD.left + xi * (PLOT_W / 3);
                const zy = PAD.top + (2 - yi) * (PLOT_H / 3);
                const zoneColors = [
                  ["#e8ded308", "#e8ded308", "#5b7b6308"],
                  ["#e8ded308", "#93594108", "#93594110"],
                  ["#5b7b6308", "#93594110", "#93594118"],
                ];
                return (
                  <g key={`zone-${xi}-${yi}`}>
                    <rect
                      x={zx}
                      y={zy}
                      width={PLOT_W / 3}
                      height={PLOT_H / 3}
                      fill={zoneColors[yi]?.[xi] ?? "transparent"}
                      stroke="#e8ded3"
                      strokeWidth="0.5"
                    />
                    <text
                      x={zx + 8}
                      y={zy + 16}
                      fill="#8a7f75"
                      fontSize="9"
                      fontWeight="700"
                      opacity="0.6"
                    >
                      {ZONE_LABELS[yi]?.[xi] ?? ""}
                    </text>
                  </g>
                );
              }),
            )}

            {/* X 軸分隔標籤 */}
            {["低貢獻", "中貢獻", "高貢獻"].map((label, i) => (
              <text
                key={label}
                x={PAD.left + (i + 0.5) * (PLOT_W / 3)}
                y={H - 10}
                fill="#8a7f75"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {label}
              </text>
            ))}

            {/* Y 軸標籤 */}
            {["低", "中", "高"].map((label, i) => (
              <text
                key={label}
                x={PAD.left - 10}
                y={PAD.top + (2.5 - i) * (PLOT_H / 3)}
                fill="#8a7f75"
                fontSize="10"
                fontWeight="700"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {label}
              </text>
            ))}

            {/* X 軸線 */}
            <line
              x1={PAD.left}
              y1={PAD.top + PLOT_H}
              x2={PAD.left + PLOT_W}
              y2={PAD.top + PLOT_H}
              stroke="#e8ded3"
              strokeWidth="1"
            />
            {/* X 軸標題 */}
            <text
              x={PAD.left + PLOT_W / 2}
              y={H - 28}
              fill="#8a7f75"
              fontSize="9"
              textAnchor="middle"
              opacity="0.7"
            >
              營收貢獻佔比 →
            </text>
            {/* Y 軸標題 */}
            <text
              x={14}
              y={PAD.top + PLOT_H / 2}
              fill="#8a7f75"
              fontSize="9"
              textAnchor="middle"
              transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
              opacity="0.7"
            >
              銷售數量 ↑
            </text>

            {/* 商品氣泡 */}
            {data.map((p) => {
              const { x, y, r } = getBubble(p);
              const isHovered = tooltip?.product.productId === p.productId;
              return (
                <g
                  key={p.productId}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    const svgRect = svgRef.current?.getBoundingClientRect();
                    if (!svgRect) return;
                    setTooltip({
                      product: p,
                      x: e.clientX - svgRect.left,
                      y: e.clientY - svgRect.top,
                    });
                  }}
                  onMouseMove={(e) => {
                    const svgRect = svgRef.current?.getBoundingClientRect();
                    if (!svgRect) return;
                    setTooltip((prev) =>
                      prev
                        ? {
                            ...prev,
                            x: e.clientX - svgRect.left,
                            y: e.clientY - svgRect.top,
                          }
                        : null,
                    );
                  }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={ABC_COLOR[p.abc]}
                    fillOpacity={isHovered ? 0.9 : 0.65}
                    stroke={ABC_COLOR[p.abc]}
                    strokeWidth={isHovered ? "2" : "1"}
                    style={{ transition: "all 0.15s ease" }}
                  />
                  {r > 16 && (
                    <text
                      x={x}
                      y={y + 1}
                      fill="white"
                      fontSize="7"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {p.name.length > 5 ? p.name.slice(0, 5) + "…" : p.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Tooltip */}
            {tooltip &&
              (() => {
                const p = tooltip.product;
                const tx = Math.min(tooltip.x, W - 200);
                const ty = Math.max(tooltip.y - 80, PAD.top);
                return (
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={tx}
                      y={ty}
                      width={190}
                      height={80}
                      rx="8"
                      fill="#faf7f2"
                      stroke={ABC_COLOR[p.abc]}
                      strokeWidth="1.5"
                    />
                    <text
                      x={tx + 10}
                      y={ty + 18}
                      fill={ABC_COLOR[p.abc]}
                      fontSize="10"
                      fontWeight="800"
                    >
                      [{p.abc}] {p.name}
                    </text>
                    <text
                      x={tx + 10}
                      y={ty + 34}
                      fill="#675e53"
                      fontSize="9"
                    >
                      銷售數量：{p.salesQty} 件
                    </text>
                    <text
                      x={tx + 10}
                      y={ty + 48}
                      fill="#675e53"
                      fontSize="9"
                    >
                      銷售金額：NT$ {p.revenue.toLocaleString()}
                    </text>
                    <text
                      x={tx + 10}
                      y={ty + 62}
                      fill="#675e53"
                      fontSize="9"
                    >
                      貢獻佔比：{p.revenuePct.toFixed(1)}%
                    </text>
                  </g>
                );
              })()}
          </svg>

          {/* 圖例 */}
          <div className="flex items-center gap-6 mt-3 px-2 flex-wrap">
            {(["A", "B", "C"] as const).map((cls) => {
              const names = {
                A: "核心商品 (前 70%)",
                B: "穩定商品 (70-90%)",
                C: "觀察商品",
              };
              return (
                <div key={cls} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: ABC_COLOR[cls] }}
                  />
                  <span className="text-xs text-[#675e53] font-medium">
                    {names[cls]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 詳細表格 */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm">
        <div className="p-5 border-b border-[#e8ded3]">
          <p className="text-sm font-semibold text-[#302b26]">商品分類明細</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#e8ded3] bg-[#fcfaf7]">
                {[
                  "分類",
                  "商品名稱",
                  "近期趨勢",
                  "健康指數",
                  "銷售量",
                  "貢獻金額",
                  "佔比",
                  "策略建議",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-semibold text-[#675e53] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr
                  key={p.productId}
                  className={`border-b border-[#e8ded3] hover:bg-[#fbf8f4] transition-colors ${i % 2 === 0 ? "" : "bg-[#fdfcfa]"}`}
                >
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold"
                      style={{
                        background: ABC_COLOR[p.abc] + "22",
                        color: ABC_COLOR[p.abc],
                      }}
                    >
                      {p.abc}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#302b26] max-w-[140px] truncate">
                    {p.name}
                  </td>
                  <td className="px-4 py-3">
                    {p.velocity > 0.1 ? (
                      <span className="text-xs font-semibold text-[#5b7b63]">
                        ↑ {Math.round(p.velocity * 100)}%
                      </span>
                    ) : p.velocity < -0.1 ? (
                      <span className="text-xs font-semibold text-rose-600">
                        ↓ {Math.abs(Math.round(p.velocity * 100))}%
                      </span>
                    ) : (
                      <span className="text-xs text-[#8a7f75]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-16 h-1.5 rounded-full bg-[#f0ece4] overflow-hidden">
                      <div
                        className="h-full transition-all duration-1000 rounded-full"
                        style={{
                          width: `${p.healthScore}%`,
                          background:
                            p.healthScore > 70
                              ? "#5b7b63"
                              : p.healthScore > 40
                                ? "#935941"
                                : "#c98e3b",
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#675e53] font-mono">
                    {p.salesQty}
                  </td>
                  <td
                    className="px-4 py-3 font-mono font-semibold"
                    style={{ color: ABC_COLOR[p.abc] }}
                  >
                    NT$ {p.revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#8a7f75]">
                    {p.revenuePct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-[#8a7f75] max-w-[200px] text-[10px] leading-relaxed">
                    {getStrategy(p, maxQty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

