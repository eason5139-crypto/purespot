"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, CreditCard, Landmark, LockKeyhole, Radio, Smartphone, Store } from "lucide-react";
import { money } from "@/lib/utils";

type Method = "credit" | "linepay" | "transfer" | "cvs";

export function PaymentExperience({ method, total, onReadyChange }: { method: string; total: number; onReadyChange: (ready: boolean) => void }) {
  const [phase, setPhase] = useState(0);
  const [copied, setCopied] = useState(false);
  const selected = method as Method;

  useEffect(() => { setPhase(0); setCopied(false); onReadyChange(method === "transfer" || method === "cvs"); }, [method, onReadyChange]);
  function advance() { const next = Math.min(phase + 1, 2); setPhase(next); if (next === 2) onReadyChange(true); }

  return <div className="mb-6 overflow-hidden rounded-[1.7rem] border border-[#bcd5e9] bg-[#f2f8fc] text-[#253b4d] shadow-[0_18px_45px_rgba(40,74,99,.09)]" aria-live="polite">
    <AnimatePresence mode="wait">
      {selected === "credit" && <motion.div key="credit" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 font-semibold"><CreditCard size={20}/> 信用卡</span><span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] text-[#557589]"><LockKeyhole size={12}/> 安全確認畫面</span></div>
        <p className="mt-2 text-xs text-[#657788]">以卡片感應方式完成站內結帳確認，無需輸入卡號。</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_90px] sm:items-center">
          <motion.div animate={phase === 1 ? { x: [0, 16, 0], rotate: [0, -3, 0] } : { y: [0, -4, 0] }} transition={{ duration: phase === 1 ? .65 : 3, repeat: phase === 1 ? 0 : Infinity }} className="relative max-w-[320px] overflow-hidden rounded-[1.3rem] bg-[linear-gradient(135deg,#19364d,#477da4_65%,#83b6d2)] p-5 text-white shadow-[0_22px_35px_rgba(35,75,105,.28)]">
            <motion.div className="pointer-events-none absolute inset-y-0 w-20 -skew-x-12 bg-white/15 blur-xl" initial={{ x: -130 }} animate={{ x: 390 }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.7 }}/>
            <div className="relative flex justify-between text-xs font-semibold tracking-[.18em]"><span>PURESPOT</span><Radio size={20}/></div>
            <div className="relative mt-7 grid h-6 w-8 place-items-center rounded-md bg-[#e4d7b0] text-[#8f8464]">▤</div>
            <p className="relative mt-5 font-mono text-lg tracking-[.22em]">•••• •••• •••• 2004</p>
            <p className="relative mt-4 text-[10px] tracking-[.15em] text-white/75">PURESPOT MEMBER</p>
          </motion.div>
          <div className="mx-auto flex flex-col items-center gap-2 text-center text-[11px] text-[#52748b]"><motion.div animate={phase > 0 ? { scale: [1, 1.12, 1] } : { opacity: [.5, 1, .5] }} transition={{ duration: 1.7, repeat: Infinity }} className="grid size-16 place-items-center rounded-full border-2 border-[#aac8d9] bg-white shadow-sm"><Radio size={27}/></motion.div><span>{phase === 0 ? "等待感應" : phase === 1 ? "已感應" : "已確認"}</span></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#cfdee7] pt-5"><div><p className="text-xs text-[#657788]">本次金額</p><strong className="font-mono text-2xl text-[#25445b]">{money(total)}</strong></div>{phase < 2 ? <button type="button" onClick={advance} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#315F86] px-5 text-sm font-bold text-white hover:bg-[#244b6b]">{phase === 0 ? <Radio size={17}/> : <Check size={17}/>} {phase === 0 ? "感應卡片" : "確認此筆付款"}</button> : <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#2a765d]"><CheckCircle2 size={19}/> 可送出訂單</span>}</div>
      </motion.div>}
      {selected === "linepay" && <motion.div key="linepay" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 font-semibold"><Smartphone size={20}/> LINE Pay</span><span className="rounded-full bg-[#e3f8ea] px-3 py-1 text-[11px] font-semibold text-[#14733c]">手機確認</span></div><p className="mt-2 text-xs text-[#657788]">依序查看金額、開啟付款畫面並確認。</p><motion.div layout className="mx-auto mt-5 w-[245px] overflow-hidden rounded-[2.2rem] border-[8px] border-[#203846] bg-white shadow-[0_25px_45px_rgba(25,55,73,.23)]"><div className="mx-auto mt-2 h-1 w-16 rounded-full bg-[#b8c5cb]"/><div className="mt-4 bg-[#06c755] px-5 py-4 text-center text-sm font-bold text-white">LINE Pay</div><div className="px-5 pb-5 pt-6 text-center"><motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.2, repeat: Infinity }} className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#dff8e7] text-[#06a846]"><Smartphone size={28}/></motion.div><p className="mt-4 text-xs text-[#73848b]">付款給</p><p className="font-bold text-[#253b4d]">PURESPOT</p><p className="mt-3 font-mono text-3xl font-bold text-[#253b4d]">{money(total)}</p><div className="mt-4 border-t border-[#e8eeee] pt-4 text-left text-xs text-[#6b7c82]"><span>付款進度</span><strong className="float-right text-[#06a846]">{phase === 0 ? "待開啟" : phase === 1 ? "待確認" : "已確認"}</strong></div></div></motion.div><div className="mt-6 flex justify-center">{phase < 2 ? <button type="button" onClick={advance} className="inline-flex min-h-12 min-w-[220px] items-center justify-center gap-2 rounded-xl bg-[#06b64d] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(6,182,77,.2)] hover:bg-[#069d45]">{phase === 0 ? <Smartphone size={18}/> : <Check size={18}/>} {phase === 0 ? "開啟付款畫面" : "確認付款"}</button> : <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#14733c]"><CheckCircle2 size={19}/> 可送出訂單</span>}</div></motion.div>}
      {selected === "transfer" && <motion.div key="transfer" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-7"><div className="flex items-center gap-2 font-semibold"><Landmark size={20}/> ATM 轉帳資訊</div><div className="mt-5 rounded-2xl bg-white p-5"><dl className="grid gap-3 text-sm sm:grid-cols-[6rem_1fr]"><dt className="text-[#657788]">銀行代碼</dt><dd className="font-mono">000</dd><dt className="text-[#657788]">戶名</dt><dd>PURESPOT</dd><dt className="text-[#657788]">帳號</dt><dd className="font-mono">000-000-000000</dd><dt className="text-[#657788]">應付金額</dt><dd className="font-mono font-bold">{money(total)}</dd></dl></div><p className="mt-4 text-xs font-semibold leading-6 text-[#315F86]">此帳號不能匯款，請勿使用真實銀行 App 操作。</p><button type="button" onClick={async () => { await navigator.clipboard.writeText("000-000-000000"); setCopied(true); }} className="mt-4 min-h-11 rounded-xl border border-[#b8cfdd] bg-white px-4 text-sm font-semibold text-[#315F86] hover:bg-[#e8f1f8]">{copied ? "已複製帳號" : "複製帳號"}</button></motion.div>}
      {selected === "cvs" && <motion.div key="cvs" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-7"><div className="flex items-center gap-2 font-semibold"><Store size={20}/> 超商取貨付款</div><p className="mt-4 rounded-xl bg-white p-5 text-sm leading-7">確認收件資料後，即可建立訂單並於會員帳戶查看。</p></motion.div>}
    </AnimatePresence>
    <p className="border-t border-[#cfdee7] bg-white/65 px-5 py-3 text-xs leading-5 text-[#647986]">目前不會向銀行或 LINE Pay 發出扣款請求，請勿在此輸入真實付款資料。</p>
  </div>;
}
