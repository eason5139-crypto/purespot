"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Bell, Check, Coins, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest } from "@/lib/accountTypes";
import { money } from "@/lib/utils";

type Snapshot = {
  points: number; spentNt: number; tier: string; nextTierNt: number | null;
  config: { silverSpendNt: number; goldSpendNt: number };
  badges: { title: string; missionTitle: string; points: number; earned: boolean }[];
  entries: { id: string; title: string; points: number; createdAt: string }[];
  rewards: { id: string; title: string; pointsCost: number; discountNt: number }[];
  redemptions: { id: string; code: string; discountNt: number; reward: { title: string } }[];
  notifications: { id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string }[];
};

export function MemberClub() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<"rewards" | "badges" | "history" | "notices">("rewards");
  async function load() { try { setData(await accountJson<Snapshot>("/api/account/membership")); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "會員資料暫時無法載入"); } }
  useEffect(() => { void load(); }, []);
  async function redeem(id: string) {
    setBusy(id);
    try { await accountJson("/api/account/membership", jsonRequest("POST", { action: "redeem", rewardId: id })); await load(); toast.success("優惠已放進帳戶，結帳時可選用"); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "兌換失敗"); }
    finally { setBusy(""); }
  }
  async function markRead(id: string) {
    try { await accountJson("/api/account/membership", jsonRequest("POST", { action: "read", notificationId: id })); await load(); }
    catch { toast.error("通知更新失敗"); }
  }
  const target = data?.nextTierNt ?? data?.config.goldSpendNt ?? 1;
  const percent = Math.min(100, Math.round((data?.spentNt ?? 0) / target * 100));
  return <section className="space-y-6"><header><h2 className="editorial-title text-3xl text-[#263746]">PURESPOT 會員日常</h2><p className="mt-2 text-sm text-[#687985]">消費與日常任務都會留下足跡，點數可換結帳優惠。</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#315F86] via-[#467ba5] to-[#8bb7d6] p-7 text-white shadow-lg"><div className="absolute -right-10 -top-10 size-52 rounded-full border border-white/20" /><div className="absolute right-8 top-7 opacity-30"><Sparkles size={70} /></div><p className="text-xs tracking-[.17em]">PURESPOT MEMBER</p><h3 className="mt-8 font-serif text-3xl">{data?.tier || "載入中"}</h3><div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><span className="text-xs text-white/80">目前點數</span><p className="mt-1 flex items-center gap-2 text-4xl font-semibold"><Coins size={28} />{data?.points ?? "—"}</p></div><div className="text-right text-xs leading-6 text-white/85"><p>累計選物 {money(data?.spentNt ?? 0)}</p><p>{data?.nextTierNt ? `再累積 ${money(Math.max(0, data.nextTierNt - data.spentNt))} 升級` : "已達最高等級"}</p></div></div><div className="mt-5 h-2 rounded-full bg-white/25"><motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: .7 }} className="h-full rounded-full bg-white" /></div></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([ ["rewards", "點數兌換", Gift], ["badges", "我的徽章", Award], ["history", "點數紀錄", Coins], ["notices", "通知中心", Bell] ] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-transform hover:-translate-y-0.5 ${view === id ? "border-[#5B93C5] bg-[#e8f1f8] text-[#315F86]" : "border-[#e1d7cc] bg-white text-[#687985]"}`}><Icon size={16} />{label}{id === "notices" && data?.notifications.some((entry) => !entry.readAt) ? <span className="size-1.5 rounded-full bg-[#b95f4e]" /> : null}</button>)}</div>
    {view === "rewards" && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{data?.rewards.map((reward) => <article key={reward.id} className="rounded-2xl border border-[#e1d7cc] bg-white p-5"><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#f5e9dc] text-[#935941]"><Gift size={21} /></span><div><h3 className="font-semibold text-[#263746]">{reward.title}</h3><p className="mt-1 text-xs text-[#687985]">需要 {reward.pointsCost} 點 · 結帳折抵 {money(reward.discountNt)}</p></div></div><button type="button" disabled={busy === reward.id || (data?.points ?? 0) < reward.pointsCost} onClick={() => void redeem(reward.id)} className="mt-5 min-h-10 w-full rounded-xl bg-[#315F86] text-xs font-semibold text-white disabled:opacity-40">{busy === reward.id ? "兌換中…" : "兌換優惠"}</button></article>)}</div>{Boolean(data?.redemptions.length) && <div className="rounded-2xl border border-[#e1d7cc] bg-[#fff9ef] p-5"><h3 className="font-semibold text-[#263746]">可使用的優惠</h3><div className="mt-3 space-y-2">{data?.redemptions.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm"><span>{item.reward.title}</span><button type="button" className="font-mono font-semibold text-[#315F86]" onClick={() => { void navigator.clipboard.writeText(item.code); toast.success("優惠碼已複製"); }}>{item.code} · 複製</button></div>)}</div></div>}</div>}
    {view === "badges" && <div className="grid gap-3 sm:grid-cols-2">{data?.badges.map((badge) => <div key={badge.title} className={`flex items-center gap-4 rounded-2xl border p-5 ${badge.earned ? "border-[#b7d3e7] bg-[#f1f7fa]" : "border-[#e1d7cc] bg-white opacity-65"}`}><span className={`grid size-12 place-items-center rounded-full ${badge.earned ? "bg-[#d6e7f2] text-[#315F86]" : "bg-[#eee9e2] text-[#8b918f]"}`}><Award size={24} /></span><div><h3 className="font-semibold">{badge.title}</h3><p className="mt-1 text-xs text-[#687985]">{badge.earned ? "已收藏這枚徽章" : `${badge.missionTitle} · +${badge.points} 點`}</p></div>{badge.earned && <Check size={18} className="ml-auto text-[#4e6752]" />}</div>)}</div>}
    {view === "history" && <div className="rounded-2xl border border-[#e1d7cc] bg-white p-5"><h3 className="font-semibold">點數紀錄</h3>{data?.entries.length ? data.entries.map((entry) => <div key={entry.id} className="flex justify-between gap-4 border-b border-[#eee7df] py-3 text-sm"><span>{entry.title}<small className="ml-2 text-[#8b918f]">{new Date(entry.createdAt).toLocaleDateString("zh-TW")}</small></span><strong className={entry.points >= 0 ? "text-[#4e6752]" : "text-[#935941]"}>{entry.points >= 0 ? "+" : ""}{entry.points}</strong></div>) : <p className="mt-4 text-sm text-[#687985]">完成任務或選物後，紀錄會出現在這裡。</p>}</div>}
    {view === "notices" && <div className="space-y-2">{data?.notifications.length ? data.notifications.map((notice) => <article key={notice.id} className={`rounded-2xl border p-4 ${notice.readAt ? "border-[#e1d7cc] bg-white" : "border-[#b7d3e7] bg-[#f1f7fa]"}`}><div className="flex justify-between gap-3"><strong className="text-sm">{notice.title}</strong><button type="button" onClick={() => void markRead(notice.id)} disabled={Boolean(notice.readAt)} className="text-xs font-semibold text-[#315F86] disabled:opacity-40">{notice.readAt ? "已讀" : "標為已讀"}</button></div><p className="mt-1 text-xs leading-5 text-[#687985]">{notice.body}</p></article>) : <p className="rounded-2xl bg-white p-6 text-sm text-[#687985]">目前沒有新通知。</p>}</div>}
  </section>;
}
