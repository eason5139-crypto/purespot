"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, PackageOpen, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { GiftCard } from "@/lib/giftCard";

export function GiftCardPreview({ card, full = false }: { card: GiftCard; full?: boolean }) {
  const [view, setView] = useState<"card" | "parcel">("card");
  const [side, setSide] = useState<"front" | "back">("front");
  const [expanded, setExpanded] = useState(false);
  const isBlue = card.tone === "blue";
  const accent = isBlue ? "#5B93C5" : "#935941";
  const border = isBlue ? "#b7d3e7" : "#dcc8af";
  const paper = isBlue ? "#f1f7fa" : "#fff8ec";
  return <><div className={`mt-3 overflow-hidden rounded-2xl border border-[#dfd3c3] bg-[#f0e9df] ${full ? "p-5" : "p-3"}`}>
    {!full && <button type="button" onClick={() => setExpanded(true)} className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#315F86] px-3 py-2.5 text-xs font-semibold text-white"><Maximize2 size={14} />放大看完整小卡與包裹</button>}
    <div className="flex gap-1 rounded-xl bg-white/75 p-1 text-xs font-semibold">
      <button type="button" onClick={() => setView("card")} aria-pressed={view === "card"} className={`flex-1 rounded-lg py-2 ${view === "card" ? "bg-[#315F86] text-white" : "text-[#5b6265]"}`}>小卡正反面</button>
      <button type="button" onClick={() => setView("parcel")} aria-pressed={view === "parcel"} className={`flex-1 rounded-lg py-2 ${view === "parcel" ? "bg-[#315F86] text-white" : "text-[#5b6265]"}`}>放進包裹</button>
    </div>
    <AnimatePresence mode="wait">
      <motion.div key={`${view}-${side}`} initial={{ opacity: 0, rotateY: -12, y: 6 }} animate={{ opacity: 1, rotateY: 0, y: 0 }} exit={{ opacity: 0, rotateY: 12, y: -6 }} transition={{ duration: .24 }} className="mx-auto mt-3 max-w-sm">
        {view === "card" ? <div className={`relative flex flex-col justify-between overflow-hidden rounded-xl border-2 p-5 shadow-[0_12px_30px_#6b574433] ${full ? "min-h-72" : "min-h-44"}`} style={{ background: paper, borderColor: border, color: accent, fontFamily: card.font === "serif" ? "serif" : "inherit" }}>
          <div className="absolute -right-8 -top-8 size-32 rounded-full border border-current opacity-10" />
          {side === "front" ? <><span className="text-[10px] tracking-[.24em]">PURESPOT • WITH CARE</span><div><p className="text-sm">致 {card.recipient || "親愛的毛孩"}</p><p className={`mt-3 leading-relaxed ${full ? "text-2xl" : "text-lg"}`}>{card.message || "寫一段話，送給毛孩和家人。"}</p></div><p className="text-right text-sm">{card.signature || "PURESPOT"}</p></> : <><span className="text-[10px] tracking-[.24em]">A LITTLE NOTE</span><div className="mx-auto grid size-16 place-items-center rounded-full border-2 border-current text-center text-xs font-bold leading-tight shadow-inner">PURE<br />SPOT</div><p className="text-center text-xs">每一份日常，都值得被好好收藏。</p></>}
        </div> : <div className="relative min-h-48 overflow-hidden rounded-xl border-2 border-[#c9ac88] bg-[#d9bb94] p-5 shadow-inner"><div className="absolute inset-x-5 top-5 h-16 origin-top -skew-x-6 rounded-sm bg-[#b69670] shadow-lg" /><div className="relative mt-8 flex items-end gap-3"><div className="flex h-32 w-28 shrink-0 flex-col justify-between rounded-md bg-[#e9e0d2] p-3 shadow-xl"><span className="text-[10px] tracking-widest text-[#315F86]">PURESPOT</span><PackageOpen className="mx-auto text-[#315F86]" size={32} /><span className="text-center text-[9px] text-[#6e685f]">毛孩的日常選物</span></div><div className="-rotate-6 rounded-md border p-3 shadow-lg" style={{ background: paper, borderColor: border, color: accent, fontFamily: card.font === "serif" ? "serif" : "inherit" }}><span className="text-[8px] tracking-widest">PURESPOT</span><p className="mt-2 line-clamp-3 text-xs leading-5">{card.message}</p><Sparkles size={13} className="ml-auto mt-2" /></div></div></div>}
      </motion.div>
    </AnimatePresence>
    {view === "card" && <div className="mt-3 flex justify-center gap-2 text-xs"><button type="button" onClick={() => setSide("front")} aria-pressed={side === "front"} className={`rounded-full px-3 py-1 ${side === "front" ? "bg-[#935941] text-white" : "bg-white text-[#675e53]"}`}>正面</button><button type="button" onClick={() => setSide("back")} aria-pressed={side === "back"} className={`rounded-full px-3 py-1 ${side === "back" ? "bg-[#935941] text-white" : "bg-white text-[#675e53]"}`}>背面</button></div>}
    <p className="mt-2 text-center text-[10px] text-[#756759]">畫面呈現排版與放置位置，實物材質可能略有差異。</p>
  </div>{!full && <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-w-xl"><DialogTitle className="font-serif text-2xl text-[#263746]">隨箱問候卡預覽</DialogTitle><GiftCardPreview card={card} full /></DialogContent></Dialog>}</>;
}
