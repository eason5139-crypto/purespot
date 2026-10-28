"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineSeries,
  LineStyle,
  type BusinessDay,
  type Time,
  type AutoscaleInfo,
  type IChartApi,
} from "lightweight-charts";
import { Activity, FlaskConical } from "lucide-react";
import type { BatchRecord } from "@/lib/types";
interface Props {
  batches: BatchRecord[];
  proteinMin: number;
  moistureMax: number;
  ashMax: number;
  title?: string;
}
function day(date: string): BusinessDay {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}
export function NutritionalTrendChart({
  batches,
  proteinMin,
  moistureMax,
  ashMax,
  title = "每一批，安心看得見。",
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [metric, setMetric] = useState<"protein" | "moisture" | "ash">(
    "protein",
  );
  const unique = new Map<string, BatchRecord>();
  for (const b of batches) {
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
      Number.isFinite(Date.parse(b.date)) &&
      new Date(b.date).toISOString().slice(0, 10) === b.date &&
      [b.protein, b.moisture, b.ash].every(Number.isFinite)
    )
      unique.set(b.date, b);
  }
  const rows = [...unique.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const serialized = JSON.stringify(rows);
  const baseline =
    metric === "protein"
      ? proteinMin
      : metric === "moisture"
        ? moistureMax
        : ashMax;
  const color =
    metric === "protein"
      ? "#9b6048"
      : metric === "moisture"
        ? "#66817a"
        : "#b38a4d";
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const data: BatchRecord[] = JSON.parse(serialized);
    if (!data.length) return;
    const chart = createChart(node, {
      width: node.clientWidth,
      height: 290,
      layout: {
        background: { type: ColorType.Solid, color: "#f0e9df" },
        textColor: "#70665d",
        fontFamily: '"Noto Sans TC", system-ui, sans-serif',
        fontSize: 12,
        attributionLogo: true,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#d8cbbf" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.2, bottom: 0.2 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        tickMarkFormatter: (time: Time) =>
          typeof time === "object" ? `${time.month}/${time.day}` : "",
      },
      localization: {
        locale: "zh-TW",
        priceFormatter: (price: number) => `${price.toFixed(1)}%`,
        dateFormat: "yyyy/MM/dd",
      },
      crosshair: {
        horzLine: { color: "#8e8072", labelBackgroundColor: "#6f6257" },
        vertLine: { color: "#8e8072", labelBackgroundColor: "#6f6257" },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });
    chartRef.current = chart;
    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      pointMarkersVisible: true,
      pointMarkersRadius: 4,
      priceLineVisible: false,
      lastValueVisible: true,
      autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
        const info = original();
        if (info?.priceRange) {
          info.priceRange.minValue =
            Math.min(info.priceRange.minValue, baseline) - 0.4;
          info.priceRange.maxValue =
            Math.max(info.priceRange.maxValue, baseline) + 0.4;
        }
        return info;
      },
    });
    series.setData(data.map((b) => ({ time: day(b.date), value: b[metric] })));
    series.createPriceLine({
      price: baseline,
      color: "#b38a4d",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: metric === "protein" ? "最低保證值" : "最高保證值",
    });
    chart.timeScale().fitContent();
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
        chart.timeScale().fitContent();
      });
    });
    observer.observe(node);
    // 先停止尺寸回呼，再釋放圖表與內部事件；支援嚴格模式重掛載。
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      chart.remove();
      chartRef.current = null;
    };
  }, [serialized, metric, baseline, color]);
  const last = rows.at(-1);
  const allPass =
    rows.length > 0 &&
    rows.every(
      (b) =>
        b.protein >= proteinMin && b.moisture <= moistureMax && b.ash <= ashMax,
    );
  return (
    <section
      className="overflow-hidden border border-[#d8cbbf] bg-[#f0e9df] p-5 text-[#302b26] sm:p-7"
      aria-label="商品批次檢驗數據"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="editorial-kicker mb-2 flex items-center gap-2">
            <FlaskConical size={14} />
            透明成分履歷
          </div>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <span className="border border-[#d3b99b] bg-[#f7efe6] px-3 py-1 text-xs text-[#795a3a]">
          示範檢驗數據
        </span>
      </div>
      <div className="my-6 grid grid-cols-3 gap-3">
        {(
          [
            {
              id: "protein",
              label: "粗蛋白",
              value: last?.protein,
              color: "text-[#9b6048]",
            },
            {
              id: "moisture",
              label: "水份",
              value: last?.moisture,
              color: "text-[#66817a]",
            },
            {
              id: "ash",
              label: "灰分",
              value: last?.ash,
              color: "text-[#a47b3d]",
            },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            aria-pressed={metric === m.id}
            className={`border p-3 text-left transition-colors ${metric === m.id ? "border-[#9b6048] bg-[#fffaf3]" : "border-[#d8cbbf] hover:border-[#9b6048]"}`}
          >
            <p className="text-xs text-[#70665d]">{m.label}</p>
            <p className={`mt-1 font-mono text-2xl ${m.color}`}>
              {m.value?.toFixed(1) ?? "—"}
              <span className="text-sm">%</span>
            </p>
          </button>
        ))}
      </div>
      <div
        ref={container}
        className="min-h-[290px] w-full overflow-hidden"
        aria-hidden="true"
      />
      {!rows.length && (
        <p className="py-4 text-center text-sm text-[#70665d]">
          尚無可顯示的批次資料。
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#70665d]">
        <span className="flex items-center gap-2">
          <Activity size={13} />
          {rows.length} 個批次 ·{" "}
          {allPass ? "符合示範商品保證值" : "資料不足或有批次超出保證值"}
        </span>
        <span>
          虛線：{metric === "protein" ? "最低" : "最高"}保證值 {baseline}%
        </span>
      </div>
      <details className="mt-4 border-t border-[#d8cbbf] pt-4">
        <summary className="cursor-pointer text-sm text-[#665a4d] hover:text-[#9b6048]">
          查看批次明細與資料說明
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="pb-3 text-left text-[#70665d]">
              數據供介面展示，非第三方檢驗報告；保證值取自示範商品規格。
            </caption>
            <thead>
              <tr className="border-b border-[#d8cbbf] text-[#70665d]">
                <th className="py-2">批號</th>
                <th>粗蛋白</th>
                <th>水份</th>
                <th>灰分</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.date} className="border-b border-[#e2d7ca]">
                  <td className="py-2">{b.batch}</td>
                  <td>{b.protein.toFixed(1)}%</td>
                  <td>{b.moisture.toFixed(1)}%</td>
                  <td>{b.ash.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="mt-4 text-xs text-[#70665d]">
        圖表由{" "}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          TradingView Lightweight Charts™
        </a>{" "}
        提供。Copyright © 2023 TradingView, Inc.
      </p>
    </section>
  );
}
