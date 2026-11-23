"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { SiteContent } from "@/lib/siteContent";

type Promotion = SiteContent["promotions"][number];

/** Layout and transition patterns informed by UI Layouts progressive-carousel
 * and Motion Primitives transition-panel; implemented for the existing catalog. */
export function ActivityCarousel({ promotions, autoplay = true, intervalSeconds = 5,
  selectedId, preview = false }: {
  promotions: Promotion[]; autoplay?: boolean; intervalSeconds?: number;
  selectedId?: string; preview?: boolean;
}) {
  const slides = preview ? promotions : promotions.filter((item) => item.enabled);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const reducedMotion = useReducedMotion();
  const requestedId = selectedId ?? activeId;
  const index = Math.max(0, slides.findIndex((item) => item.id === requestedId));
  const current = slides[index];
  const running = autoplay && !paused && !interacting && !documentHidden && !reducedMotion && slides.length > 1;
  const duration = Math.max(3, Math.min(15, intervalSeconds)) * 1000;
  const ids = slides.map((item) => item.id).join("|");

  useEffect(() => {
    const change = () => setDocumentHidden(document.hidden);
    change();
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);

  useEffect(() => {
    if (!running || selectedId) return;
    const timer = window.setTimeout(() => {
      const orderedIds = ids.split("|");
      setActiveId(orderedIds[(index + 1) % orderedIds.length] ?? null);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [running, duration, ids, index, selectedId]);

  if (!current) return null;
  const select = (delta: number) => setActiveId(slides[(index + delta + slides.length) % slides.length]!.id);

  return <div className="activity-carousel @container" role="region" aria-roledescription="輪播" aria-label="本期活動"
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
    }}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); select(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); select(1); }
    }}>
    <div className="activity-stage" aria-live={running ? "off" : "polite"}>
      <AnimatePresence initial={false} mode="sync">
        <motion.div key={current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : .45 }} className="activity-slide"
          role="group" aria-roledescription="投影片" aria-label={`${index + 1} / ${slides.length}`}>
          <div className="activity-image"><Image src={current.image} alt={current.title} fill priority={!preview && index === 0}
            sizes="(max-width: 700px) 100vw, 60vw" className="object-cover" />
            <span className="activity-label">本期活動</span>
          </div>
          <div className="activity-copy">
            <span className="activity-counter">{String(index + 1).padStart(2, "0")} <span>/ {String(slides.length).padStart(2, "0")}</span></span>
            <h2>{current.title || "活動標題"}</h2>
            <p>{current.description || "活動說明"}</p>
            {preview ? <span className="activity-cta">{current.ctaLabel || "前往看看"}<ArrowRight size={18} /></span>
              : <Link href={current.href} className="activity-cta">{current.ctaLabel}<ArrowRight size={18} /></Link>}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
    <div className="activity-controls">
      <div className="activity-tabs" aria-label="選擇活動">{slides.map((item, i) => <button key={item.id} type="button"
        aria-label={`查看活動 ${i + 1}：${item.title}`} aria-pressed={index === i} disabled={Boolean(selectedId)}
        onClick={() => setActiveId(item.id)} className={index === i ? "is-active" : ""}>
        <span className="activity-tab-number">{String(i + 1).padStart(2, "0")}</span><span className="activity-tab-title">{item.title}</span>
        <span className="activity-track"><motion.span key={`${item.id}-${index}-${running}`} initial={{ scaleX: index === i ? 0 : 1 }}
          animate={{ scaleX: index === i ? 1 : 0 }} transition={{ duration: index === i && running ? duration / 1000 : 0, ease: "linear" }} /></span>
      </button>)}</div>
      <div className="activity-arrows">{slides.length > 1 && <>
        {autoplay && <button type="button" aria-label={paused ? "播放活動輪播" : "暫停活動輪播"} aria-pressed={paused}
          onClick={() => setPaused((value) => !value)} disabled={Boolean(selectedId)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
        <button type="button" aria-label="上一張活動" onClick={() => select(-1)} disabled={Boolean(selectedId)}><ArrowLeft size={18} /></button>
        <button type="button" aria-label="下一張活動" onClick={() => select(1)} disabled={Boolean(selectedId)}><ArrowRight size={18} /></button>
      </>}</div>
    </div>
  </div>;
}
