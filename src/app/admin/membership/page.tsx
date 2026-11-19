"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, Gift, KeyRound, Save } from "lucide-react";

type Config = { silverSpendNt: number; goldSpendNt: number; pointsPerHundred: number };
type Reward = { id: string; title: string; pointsCost: number; discountNt: number; isActive: boolean };
type Mission = { id: string; title: string; badgeTitle: string; points: number; isActive: boolean };
type Recovery = { id: string; name: string | null; email: string; code: string; expiresAt: string };
const blankReward: Reward = { id: "", title: "", pointsCost: 50, discountNt: 50, isActive: true };

export default function AdminMembershipPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [editing, setEditing] = useState<Reward>(blankReward);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    try {
      const [membership, recovery] = await Promise.all([fetch("/api/admin/membership", { cache: "no-store" }), fetch("/api/admin/recovery", { cache: "no-store" })]);
      if (!membership.ok || !recovery.ok) throw new Error("資料載入失敗");
      const m = await membership.json() as { config: Config; rewards: Reward[]; missions: Mission[] };
      const r = await recovery.json() as { requests: Recovery[] };
      setConfig(m.config); setRewards(m.rewards); setMissions(m.missions); setRecoveries(r.requests); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "資料載入失敗"); }
  }
  useEffect(() => { void load(); }, []);
  async function save(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try { const response = await fetch("/api/admin/membership", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "儲存失敗"); await load(); toast.success("會員規則已儲存"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "儲存失敗"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-6xl space-y-7"><header><h1 className="text-3xl font-semibold text-[#302b26]">會員制度與點數商店管理</h1><p className="mt-2 text-sm text-[#6b5d50]">預設規則：每消費 NT$10 累積 1 點（即每消費 NT$100 獲 10 點），結帳 1 點可直接折抵現金 NT$1，並通用於點數商店市集。</p></header>{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <section className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Award size={20} className="text-[#935941]" />等級門檻與累點比例（10元1點・1點折1元）</h2>{config && <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{([ ["silverSpendNt", "暖心夥伴門檻（NT$）"], ["goldSpendNt", "星光夥伴 VIP 門檻（NT$）"], ["pointsPerHundred", "每消費 NT$100 獲點（設 10 即 10元1點）"] ] as const).map(([key, label]) => <label key={key} className="text-xs font-semibold text-[#6b5d50]">{label}<input className="input mt-2" type="number" min={0} value={config[key]} onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })} /></label>)}</div>}<button type="button" disabled={!config || busy} onClick={() => config && void save({ action: "config", ...config })} className="mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-[#935941] px-5 text-sm font-semibold text-white disabled:opacity-40"><Save size={16} />儲存規則</button></section>
    <section className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><h2 className="text-lg font-semibold">任務與徽章</h2><p className="mt-2 text-xs text-[#687985]">修改任務名稱、徽章名稱與獲得點數；已完成的歷史紀錄保留原點數。</p><div className="mt-4 space-y-3">{missions.map((mission, index) => <div key={mission.id} className="grid gap-3 rounded-xl bg-[#f8f5ef] p-4 sm:grid-cols-[1.5fr_1fr_100px_auto]"><label className="text-xs text-[#687985]">任務名稱<input className="input mt-1" maxLength={80} value={mission.title} onChange={(e) => setMissions(missions.map((item, i) => i === index ? { ...item, title: e.target.value } : item))} /></label><label className="text-xs text-[#687985]">徽章名稱<input className="input mt-1" maxLength={40} value={mission.badgeTitle} onChange={(e) => setMissions(missions.map((item, i) => i === index ? { ...item, badgeTitle: e.target.value } : item))} /></label><label className="text-xs text-[#687985]">點數<input className="input mt-1" type="number" min={0} max={1000} value={mission.points} onChange={(e) => setMissions(missions.map((item, i) => i === index ? { ...item, points: Number(e.target.value) } : item))} /></label><div className="flex items-end gap-3"><label className="flex items-center gap-1 pb-3 text-xs"><input type="checkbox" checked={mission.isActive} onChange={(e) => setMissions(missions.map((item, i) => i === index ? { ...item, isActive: e.target.checked } : item))} />啟用</label><button type="button" disabled={busy} onClick={() => void save({ action: "mission", ...mission })} className="min-h-10 rounded-xl bg-[#315F86] px-3 text-xs font-semibold text-white disabled:opacity-40">儲存</button></div></div>)}</div></section>
    <section className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Gift size={20} className="text-[#5B93C5]" />兌換優惠</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{rewards.map((reward) => <button type="button" key={reward.id} onClick={() => setEditing(reward)} className="rounded-xl border border-[#e1d7cc] p-4 text-left text-sm hover:border-[#5B93C5]"><strong>{reward.title}</strong><span className="mt-1 block text-xs text-[#687985]">{reward.pointsCost} 點 · 折抵 NT${reward.discountNt} · {reward.isActive ? "開放兌換" : "已停用"}</span></button>)}</div><h3 className="mt-6 font-semibold">{editing.id ? "編輯優惠" : "新增優惠"}</h3><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs text-[#687985]">名稱<input className="input mt-1" maxLength={60} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label><label className="text-xs text-[#687985]">需要點數<input className="input mt-1" type="number" min={1} value={editing.pointsCost} onChange={(e) => setEditing({ ...editing, pointsCost: Number(e.target.value) })} /></label><label className="text-xs text-[#687985]">折抵金額 NT$<input className="input mt-1" type="number" min={1} value={editing.discountNt} onChange={(e) => setEditing({ ...editing, discountNt: Number(e.target.value) })} /></label></div><label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />開放兌換</label><div className="mt-4 flex gap-2"><button type="button" disabled={busy || editing.title.trim().length < 2} onClick={() => { const { id, ...rest } = editing; void save({ action: "reward", ...(id ? { id } : {}), ...rest }); setEditing(blankReward); }} className="min-h-10 rounded-xl bg-[#315F86] px-5 text-sm font-semibold text-white disabled:opacity-40">儲存優惠</button><button type="button" onClick={() => setEditing(blankReward)} className="rounded-xl border px-4 text-sm">清空</button></div></section>
    <section className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound size={20} className="text-[#5B93C5]" />待處理的密碼重設</h2><p className="mt-2 text-xs text-[#687985]">確認申請人的身分後，再將一次性確認碼交給本人。確認碼 30 分鐘後失效。</p>{recoveries.length ? <div className="mt-4 space-y-2">{recoveries.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f8f5ef] p-3 text-sm"><span>{item.name || "會員"} · {item.email}<small className="ml-2 text-[#687985]">到期 {new Date(item.expiresAt).toLocaleTimeString("zh-TW")}</small></span><button type="button" onClick={() => { void navigator.clipboard.writeText(item.code); toast.success("確認碼已複製"); }} className="rounded-lg bg-[#315F86] px-3 py-2 font-mono font-semibold text-white">{item.code} · 複製</button></div>)}</div> : <p className="mt-4 text-sm text-[#687985]">目前沒有待處理申請。</p>}</section>
  </div>;
}
