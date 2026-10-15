"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  AreaSeries,
  type BusinessDay,
  type Time,
  type IChartApi,
} from "lightweight-charts";
import { TrendingUp, DollarSign } from "lucide-react";
import type { SalesHistoryPoint } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

interface Props {
  data: SalesHistoryPoint[];
}

function toBusinessDay(dateStr: string): BusinessDay {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

export function RevenueTrendChart({ data }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    revenue: number;
  } | null>(null);

  useEffect(() => {
    const node = container.current;
    if (!node || data.length === 0) return;

    const chart = createChart(node, {
      width: node.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontSize: 12,
        fontFamily: "var(--font-sans)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.2, bottom: 0.15 },
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
        priceFormatter: (price: number) => `$${Math.round(price).toLocaleString()}`,
        dateFormat: "yyyy/MM/dd",
      },
      crosshair: {
        horzLine: { color: "#06b6d4", labelBackgroundColor: "#0f172a" },
        vertLine: { color: "#06b6d4", labelBackgroundColor: "#0f172a" },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
    });

    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      topColor: "rgba(6, 182, 212, 0.4)",
      bottomColor: "rgba(6, 182, 212, 0.01)",
      lineColor: "#06b6d4",
      lineWidth: 2,
      pointMarkersVisible: true,
      pointMarkersRadius: 4,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    series.setData(
      data.map((item) => ({
        time: toBusinessDay(item.date),
        value: item.revenueNt,
      })),
    );

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData && param.seriesData.get(series) !== undefined) {
        const item = param.seriesData.get(series) as { value: number };
        const timeObj = param.time as BusinessDay;
        const dateStr = `${timeObj.year}/${timeObj.month}/${timeObj.day}`;
        setHoveredPoint({ date: dateStr, revenue: item.value });
      } else {
        setHoveredPoint(null);
      }
    });

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

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  const latest = data[data.length - 1];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="flex items-center gap-2 text-xs font-medium tracking-wider text-cyan-400">
            <TrendingUp size={14} />
            營業額成長動態（30日趨勢）
          </span>
          <p className="mt-1 text-2xl font-bold font-mono text-white">
            {hoveredPoint ? money(hoveredPoint.revenue) : latest ? money(latest.revenueNt) : "—"}
            <span className="ml-2 text-xs font-normal text-slate-400">
              {hoveredPoint ? hoveredPoint.date : "最新單日營收"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300">
          <DollarSign size={13} className="text-cyan-400" />
          <span>每日自動結算統計</span>
        </div>
      </div>

      <div ref={container} className="relative mt-4 h-[260px] w-full" />
    </div>
  );
}
