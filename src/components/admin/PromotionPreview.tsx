"use client";
import { useEffect, useRef, useState } from "react";
import { Laptop, Maximize2, Smartphone, Tablet, X } from "lucide-react";
import { ActivityCarousel } from "@/components/brand/ActivityCarousel";
import type { SiteContent } from "@/lib/siteContent";

const devices = [{ label: "手機", width: 390, icon: Smartphone }, { label: "平板", width: 820, icon: Tablet }, { label: "電腦", width: 1280, icon: Laptop }];
export function PromotionPreview({ content, selectedId }: { content: SiteContent; selectedId: string }) {
  const [width, setWidth] = useState(1280);
  const [available, setAvailable] = useState(400);
  const [expanded, setExpanded] = useState(false);
  const [playAll, setPlayAll] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(520);
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setAvailable(entry.contentRect.width); });
    observer.observe(target); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setContentHeight(entry.contentRect.height); });
    observer.observe(target); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);
  const scale = Math.min(1, Math.max(.1, available / width));
  return <aside role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label="活動即時預覽"
    className={`${expanded ? "fixed inset-3 z-[90] overflow-auto sm:inset-8" : "lg:sticky lg:top-6"} self-start overflow-hidden rounded-2xl border border-[#cbdbe5] bg-[#edf3f6]`}>
    <div className="border-b border-[#d3e0e7] bg-white p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-[#18344c]">首頁活動即時預覽</h2>
      <button type="button" aria-label={expanded ? "關閉放大預覽" : "放大活動預覽"} onClick={() => setExpanded((v) => !v)} className="grid size-9 place-items-center rounded-full text-[#315f86] hover:bg-[#edf3f6]">{expanded ? <X size={18} /> : <Maximize2 size={17} />}</button></div>
      <p className="mt-2 text-xs leading-6 text-[#647581]">文字與照片會立即更新。儲存後才會顯示在首頁。</p>
      <div role="group" aria-label="活動預覽裝置" className="mt-4 flex rounded-xl bg-[#edf3f6] p-1">{devices.map((d) => <button key={d.label} type="button" aria-pressed={width === d.width} onClick={() => setWidth(d.width)} className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs ${width === d.width ? "bg-white font-semibold text-[#315f86] shadow-sm" : "text-[#647581]"}`}><d.icon size={15} />{d.label}</button>)}</div>
      <label className="mt-3 flex items-center gap-2 text-xs text-[#526b7c]"><input type="checkbox" checked={playAll} onChange={(e) => setPlayAll(e.target.checked)} />播放全部啟用活動</label>
    </div>
    <div className="p-3 sm:p-5"><div ref={container} className="overflow-hidden"><div style={{ height: contentHeight * scale, width: width * scale }} className="mx-auto">
      <div ref={canvas} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ActivityCarousel key={`${playAll}-${width}`} promotions={content.promotions} preview={!playAll}
          selectedId={playAll ? undefined : selectedId} autoplay={playAll && content.promotionAutoplay} intervalSeconds={content.promotionIntervalSeconds} />
      </div>
    </div></div><p className="mt-3 text-center text-xs text-[#647581]">{width} px · 與首頁使用相同版型</p></div>
  </aside>;
}
