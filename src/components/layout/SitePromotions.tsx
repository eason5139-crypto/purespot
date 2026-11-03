"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import type { SiteContent } from "@/lib/siteContent";

const seenKey = "purespot-promotions-seen-v1";

export function SitePromotions({ promotions, path }: { promotions: SiteContent["promotions"]; path: string }) {
  const enabled = promotions.filter((item) => item.enabled);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if ((path !== "/" && path !== "/shop") || enabled.length === 0 || window.parent !== window) return;
    setVisible(true);
    try { if (sessionStorage.getItem(seenKey)) return; } catch { /* Private browsing may disable storage. */ }
    const timer = window.setTimeout(() => { setOpen(true); try { sessionStorage.setItem(seenKey, "1"); } catch { /* Keep the promotion usable. */ } }, 1400);
    return () => window.clearTimeout(timer);
  }, [path, enabled.length]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [open]);

  if (!visible || enabled.length === 0) return null;
  const current = enabled[index % enabled.length]!;
  const step = (delta: number) => setIndex((value) => (value + delta + enabled.length) % enabled.length);

  return <>
    {!open && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-40 flex min-h-11 items-center gap-2 rounded-full border border-[#b7d2e4] bg-white px-4 text-xs font-semibold text-[#315F86] shadow-lg transition-transform hover:-translate-y-1"><Sparkles size={16} />看看站內活動</button>}
    <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-[#142638]/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <motion.div role="dialog" aria-modal="true" aria-label="PURESPOT 站內活動" initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: .35 }} className="relative grid max-h-[92vh] w-full max-w-[880px] overflow-y-auto rounded-[25px] bg-[#f8f5ef] shadow-[0_40px_110px_rgba(0,0,0,.35)] md:grid-cols-[.95fr_1.05fr]">
        <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="關閉站內活動" className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/95 text-[#263746] shadow-sm hover:bg-[#e8f1f8]"><X size={19} /></button>
        <div className="relative min-h-[245px] bg-[#dbe5e7] md:min-h-[450px]"><Image src={current.image} alt="" fill sizes="(max-width:768px) 100vw,440px" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#142638]/30 to-transparent" /></div>
        <div className="flex flex-col justify-between p-6 sm:p-9 md:py-12"><div><p className="flex items-center gap-2 text-[11px] font-bold tracking-[.18em] text-[#5B93C5]"><Sparkles size={15} /> PURESPOT PICKS · {String(index + 1).padStart(2, "0")} / {String(enabled.length).padStart(2, "0")}</p><h2 className="editorial-title mt-6 text-3xl leading-[1.2] text-[#263746] sm:text-4xl">{current.title}</h2><p className="mt-5 max-w-sm text-sm leading-7 text-[#5f6e76]">{current.description}</p><Link href={current.href} onClick={() => setOpen(false)} className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#315F86] px-6 text-sm font-semibold text-white hover:bg-[#244b6b]">{current.ctaLabel}<ArrowRight size={17} /></Link></div><div className="mt-10 flex items-center justify-between border-t border-[#dbe3e6] pt-5"><div className="flex gap-2">{enabled.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`查看第 ${itemIndex + 1} 張活動`} aria-current={index === itemIndex ? "true" : undefined} onClick={() => setIndex(itemIndex)} className={`h-2 rounded-full transition-all ${index === itemIndex ? "w-8 bg-[#315F86]" : "w-2 bg-[#bacbd7]"}`} />)}</div><div className="flex gap-2"><button type="button" onClick={() => step(-1)} aria-label="上一張活動" className="grid size-10 place-items-center rounded-full border border-[#cbd7df] bg-white text-[#315F86] hover:bg-[#e8f1f8]"><ArrowLeft size={17} /></button><button type="button" onClick={() => step(1)} aria-label="下一張活動" className="grid size-10 place-items-center rounded-full border border-[#cbd7df] bg-white text-[#315F86] hover:bg-[#e8f1f8]"><ArrowRight size={17} /></button></div></div></div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </>;
}
