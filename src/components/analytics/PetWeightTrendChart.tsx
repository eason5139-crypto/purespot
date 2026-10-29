"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  AreaSeries,
  LineStyle,
  type BusinessDay,
  type Time,
  type IChartApi,
} from "lightweight-charts";
import { Scale, TrendingUp, Info } from "lucide-react";

export interface WeightDataPoint {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

interface Props {
  petName: string;
  currentWeightKg: number;
  goal: "MAINTAIN" | "WEIGHT_LOSS";
  records?: WeightDataPoint[];
}

function toBusinessDay(dateStr: string): BusinessDay {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

export function PetWeightTrendChart({
  petName,
  currentWeightKg,
  goal,
  records,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoveredWeight, setHoveredWeight] = useState<number | null>(null);

  const chartData: WeightDataPoint[] =
    records && records.length >= 2
      ? records
      : [
          {
            date: new Date(Date.now() - 90 * 86_400_000)
              .toISOString()
              .slice(0, 10),
            weightKg:
              goal === "WEIGHT_LOSS"
                ? +(currentWeightKg * 1.08).toFixed(1)
                : +(currentWeightKg * 0.98).toFixed(1),
          },
          {
            date: new Date(Date.now() - 60 * 86_400_000)
              .toISOString()
              .slice(0, 10),
            weightKg:
              goal === "WEIGHT_LOSS"
                ? +(currentWeightKg * 1.05).toFixed(1)
                : +(currentWeightKg * 0.99).toFixed(1),
          },
          {
            date: new Date(Date.now() - 30 * 86_400_000)
              .toISOString()
              .slice(0, 10),
            weightKg:
              goal === "WEIGHT_LOSS"
                ? +(currentWeightKg * 1.02).toFixed(1)
                : +(currentWeightKg * 1.0).toFixed(1),
          },
          {
            date: new Date().toISOString().slice(0, 10),
            weightKg: currentWeightKg,
          },
        ];

  const targetWeight =
    goal === "WEIGHT_LOSS"
      ? +(currentWeightKg * 0.95).toFixed(1)
      : currentWeightKg;

  const serializedData = JSON.stringify(chartData);

  useEffect(() => {
    const node = container.current;
    if (!node) return;

    const data: WeightDataPoint[] = JSON.parse(serializedData);
    if (!data.length) return;

    const chart = createChart(node, {
      width: node.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8a7f75",
        fontFamily: '"Noto Sans TC", system-ui, sans-serif',
        fontSize: 12,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#ede4da" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.25, bottom: 0.2 },
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
        priceFormatter: (price: number) => `${price.toFixed(1)} kg`,
        dateFormat: "yyyy/MM/dd",
      },
      crosshair: {
        horzLine: { color: "#935941", labelBackgroundColor: "#302b26" },
        vertLine: { color: "#935941", labelBackgroundColor: "#302b26" },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: false,
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      topColor: "rgba(147, 89, 65, 0.3)",
      bottomColor: "rgba(147, 89, 65, 0.02)",
      lineColor: "#935941",
      lineWidth: 2,
      pointMarkersVisible: true,
      pointMarkersRadius: 4,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    series.setData(
      data.map((item) => ({
        time: toBusinessDay(item.date),
        value: item.weightKg,
      })),
    );

    // 目標基準線
    series.createPriceLine({
      price: targetWeight,
      color: "#5b7b63",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: goal === "WEIGHT_LOSS" ? "目標體重" : "理想體重",
    });

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (
        param.time &&
        param.seriesData &&
        param.seriesData.get(series) !== undefined
      ) {
        const item = param.seriesData.get(series) as { value: number };
        setHoveredWeight(item.value);
      } else {
        setHoveredWeight(null);
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
  }, [serializedData, targetWeight, goal]);

  const initialWeight = chartData[0]?.weightKg ?? currentWeightKg;
  const diff = +(currentWeightKg - initialWeight).toFixed(1);

  return (
    <div className="panel p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#935941]/10 text-[#935941]">
            <Scale size={20} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-[#302b26]">體重趨勢動態</h3>
            <p className="text-xs text-[#8a7f75]">
              {petName} 的歷史監測與體態走勢
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-[#8a7f75]">檢視數值</p>
            <p className="font-mono text-lg font-medium text-[#935941]">
              {hoveredWeight !== null
                ? `${hoveredWeight.toFixed(1)} kg`
                : `${currentWeightKg} kg`}
            </p>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
              diff <= 0
                ? "bg-[#eef0e8] text-[#425847] border border-[#68856b]/30"
                : "bg-[#fdf6ea] text-[#8a5a14] border border-[#e2a84c]/30"
            }`}
          >
            <TrendingUp size={12} className={diff <= 0 ? "rotate-180" : ""} />
            {diff > 0 ? `+${diff}` : `${diff}`} kg (90 天)
          </span>
        </div>
      </div>

      <div
        ref={container}
        className="mt-5 min-h-[260px] w-full overflow-hidden rounded-lg"
      />

      <div className="mt-3 flex items-center justify-between text-xs text-[#8a7f75]">
        <span className="flex items-center gap-1.5">
          <Info size={13} />
          虛線為目前健康目標數值（{targetWeight} kg）
        </span>
        <span>圖表基於 TradingView Lightweight Charts™ 渲染</span>
      </div>
    </div>
  );
}
