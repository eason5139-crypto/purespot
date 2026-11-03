"use client";

import { useEffect, useRef, useState } from "react";
import { Laptop, Maximize2, Minimize2, Smartphone, Tablet } from "lucide-react";
import type { SiteContent } from "@/lib/siteContent";

const devices = {
  phone: { label: "手機", width: 390, height: 780, icon: Smartphone },
  tablet: { label: "平板", width: 820, height: 900, icon: Tablet },
  desktop: { label: "電腦", width: 1280, height: 800, icon: Laptop },
} as const;
type Device = keyof typeof devices;
const pages = [{ path: "/", label: "首頁" }, { path: "/shop", label: "商城" }, { path: "/transparency", label: "透明資訊" }] as const;

function previewTarget(section: string, field: keyof SiteContent | null) {
  if (section === "benefits") return { page: "/", anchor: "our-approach", label: "品牌特色" } as const;
  if (section === "stories") {
    if (field?.startsWith("community")) return { page: "/", anchor: "community-story", label: "社群介紹" } as const;
    if (field?.startsWith("final")) return { page: "/", anchor: "final-invitation", label: "首頁結尾" } as const;
    return { page: "/", anchor: "family-story", label: "家庭介紹" } as const;
  }
  if (section === "pages") {
    if (field?.startsWith("transparency")) return { page: "/transparency", anchor: "main-content", label: "透明資訊" } as const;
    if (field === "shopImage") return { page: "/shop", anchor: "main-content", label: "商城主視覺" } as const;
    return { page: "/shop", anchor: "main-content", label: "商城主視覺" } as const;
  }
  if (section === "global" && field !== "announcement") return { page: "/", anchor: "site-footer", label: "全站頁尾" } as const;
  return { page: "/", anchor: "home-hero", label: section === "global" ? "頂端公告" : "首頁主視覺" } as const;
}

export function ContentDevicePreview({ content, section, field }: { content: SiteContent; section: string; field: keyof SiteContent | null }) {
  const [device, setDevice] = useState<Device>("phone");
  const [page, setPage] = useState<(typeof pages)[number]["path"]>("/");
  const [expanded, setExpanded] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(390);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const selected = devices[device];
  const target = previewTarget(section, field);
  const anchor = page === target.page ? target.anchor : (page === "/" ? "home-hero" : "main-content");
  const scale = Math.min(1, Math.max(0.2, (availableWidth - 24) / selected.width));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setAvailableWidth(entry.contentRect.width); });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "purespot-content-preview", content }, window.location.origin);
  }, [content, device, page]);

  useEffect(() => { setPage(target.page); }, [target.page]);

  useEffect(() => {
    const scroll = () => iframeRef.current?.contentDocument?.getElementById(anchor)?.scrollIntoView({ block: "start" });
    const early = window.setTimeout(scroll, 100);
    const settled = window.setTimeout(scroll, 600);
    return () => { window.clearTimeout(early); window.clearTimeout(settled); };
  }, [anchor, page, device]);

  useEffect(() => {
    if (!expanded) return;
    function close(event: KeyboardEvent) { if (event.key === "Escape") setExpanded(false); }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [expanded]);

  useEffect(() => {
    function ready(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow || event.data?.type !== "purespot-content-preview-ready") return;
      iframeRef.current?.contentWindow?.postMessage({ type: "purespot-content-preview", content }, window.location.origin);
    }
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [content]);

  return (
    <section className={`${expanded ? "fixed inset-3 z-[100] overflow-y-auto sm:inset-6" : "overflow-hidden lg:sticky lg:top-6"} rounded-[28px] border border-[#cbd7df] bg-[#e7eff5] shadow-[0_24px_65px_-40px_rgba(25,56,77,.55)]`}>
      <div className="border-b border-[#cbd7df] bg-[#f8fbfc] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><p className="text-[11px] font-bold tracking-[.17em] text-[#5B93C5]">LIVE SITE PREVIEW</p><button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "縮小預覽" : "放大預覽"} className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#315F86] hover:bg-[#e6edf2]">{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{expanded ? "縮小" : "放大"}</button></div>
        <h2 className="mt-1 text-lg font-semibold text-[#263746]">網站即時預覽</h2>
        <p className="mt-1 text-xs leading-5 text-[#65727a]">目前查看：{page === target.page ? target.label : pages.find((item) => item.path === page)?.label}。切換裝置，儲存前只有你看得到變動。</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="預覽頁面">{pages.map((item) => <button key={item.path} type="button" aria-pressed={page === item.path} onClick={() => setPage(item.path)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${page === item.path ? "bg-[#315F86] text-white" : "bg-[#e6edf2] text-[#60707b] hover:bg-[#d6e5ef]"}`}>{item.label}</button>)}</div>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-[#e6edf2] p-1" role="group" aria-label="預覽裝置">
          {(Object.entries(devices) as [Device, typeof selected][]).map(([key, item]) => {
            const Icon = item.icon;
            return <button key={key} type="button" aria-pressed={device === key} onClick={() => setDevice(key)} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all ${device === key ? "bg-white text-[#315F86] shadow-sm" : "text-[#66747f] hover:bg-white/60"}`}><Icon size={15} />{item.label}</button>;
          })}
        </div>
      </div>
      <div ref={containerRef} className="overflow-hidden p-3 sm:p-5">
        <div className="mx-auto overflow-hidden rounded-[20px] border-[6px] border-[#263746] bg-white shadow-[0_18px_40px_-20px_rgba(25,48,65,.7)]" style={{ width: selected.width * scale + 12, height: selected.height * scale + 12 }}>
          <iframe
            key={`${device}-${page}`}
            ref={iframeRef}
            title={`${selected.label}網站預覽`}
            src={`${page}#${anchor}`}
            onLoad={() => { iframeRef.current?.contentWindow?.postMessage({ type: "purespot-content-preview", content }, window.location.origin); iframeRef.current?.contentDocument?.getElementById(anchor)?.scrollIntoView({ block: "start" }); }}
            className="block border-0 bg-white"
            style={{ width: selected.width, height: selected.height, transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        </div>
        <p className="mt-3 text-center text-[11px] text-[#687985]">{selected.width} × {selected.height} · 可在預覽內捲動</p>
      </div>
    </section>
  );
}
