"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookHeart, Heart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest } from "@/lib/accountTypes";

type AlbumData = {
  pets: { id: string; name: string; avatarUrl: string | null; type: string }[];
  records: { id: string; petId: string; kind: string; note: string; weightKg: number | null; recordedAt: string }[];
  moments: { id: string; petId: string; careRecordId: string | null; title: string; note: string; createdAt: string }[];
};
const kindName: Record<string, string> = { FOOD: "飲食", WEIGHT: "體重", ALLERGY: "過敏觀察", NOTE: "日常" };

export function GrowthAlbum() {
  const [data, setData] = useState<AlbumData | null>(null);
  const [petId, setPetId] = useState("");
  const [recordId, setRecordId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() { try { const result = await accountJson<AlbumData>("/api/account/growth"); setData(result); setPetId((current) => current || result.pets[0]?.id || ""); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "收藏冊暫時無法載入"); } }
  useEffect(() => { void load(); }, []);
  async function save() { if (!recordId || !title.trim()) return; setBusy(true); try { await accountJson("/api/account/growth", jsonRequest("POST", { careRecordId: recordId, title: title.trim(), note: note.trim() })); setRecordId(""); setTitle(""); setNote(""); await load(); toast.success("這一天已收藏"); } catch (reason) { setError(reason instanceof Error ? reason.message : "收藏失敗"); } finally { setBusy(false); } }
  async function remove(id: string) { try { await accountJson("/api/account/growth", jsonRequest("DELETE", { id })); await load(); toast.success("已移出收藏冊"); } catch { toast.error("移除失敗"); } }
  const records = data?.records.filter((record) => record.petId === petId && !data.moments.some((moment) => moment.careRecordId === record.id)) ?? [];
  const moments = data?.moments.filter((moment) => moment.petId === petId) ?? [];
  const pet = data?.pets.find((entry) => entry.id === petId);
  return <section className="space-y-6"><header><h2 className="editorial-title text-3xl text-[#263746]">毛孩成長收藏冊</h2><p className="mt-2 text-sm text-[#687985]">從照顧紀錄挑出想記住的那一天，變成一張有故事的卡片。</p></header>{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2">{data?.pets.map((entry) => <button type="button" key={entry.id} onClick={() => { setPetId(entry.id); setRecordId(""); }} aria-pressed={petId === entry.id} className={`rounded-full px-4 py-2 text-xs font-semibold ${petId === entry.id ? "bg-[#315F86] text-white" : "border border-[#e1d7cc] bg-white text-[#315F86]"}`}>{entry.name}</button>)}</div>
    {petId && <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><div className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><h3 className="flex items-center gap-2 font-semibold"><Plus size={18} className="text-[#5B93C5]" />收藏一段日常</h3><label className="mt-5 block text-xs text-[#687985]">選一筆照顧紀錄<select className="input mt-1" value={recordId} onChange={(e) => { const id = e.target.value; setRecordId(id); const record = records.find((item) => item.id === id); setTitle(record ? `${kindName[record.kind] || "日常"} · ${new Date(record.recordedAt).toLocaleDateString("zh-TW")}` : ""); }}><option value="">請選擇</option>{records.map((record) => <option key={record.id} value={record.id}>{new Date(record.recordedAt).toLocaleDateString("zh-TW")} · {kindName[record.kind] || record.kind} · {record.note.slice(0, 24)}</option>)}</select></label><label className="mt-4 block text-xs text-[#687985]">卡片標題<input className="input mt-1" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：第一次一起出門" /></label><label className="mt-4 block text-xs text-[#687985]">想補充的話<textarea className="input mt-1 min-h-24" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="寫下那天最想記住的細節" /></label><button type="button" disabled={busy || !recordId || title.trim().length < 2} onClick={() => void save()} className="mt-4 min-h-11 rounded-xl bg-[#315F86] px-5 text-sm font-semibold text-white disabled:opacity-40">加入收藏冊</button>{!records.length && <p className="mt-4 text-xs text-[#687985]">先到「照顧紀錄」記下一天，再回來收藏。</p>}</div>
    <div className="rounded-[24px] border border-[#e1d7cc] bg-[#fff9ef] p-6"><div className="flex items-center gap-3"><span className="relative grid size-12 place-items-center overflow-hidden rounded-full bg-[#d6e7f2] text-[#315F86]">{pet?.avatarUrl ? <Image src={pet.avatarUrl} alt="" fill sizes="48px" className="object-cover" /> : <Heart size={21} />}</span><div><h3 className="font-serif text-xl text-[#263746]">{pet?.name}的收藏冊</h3><p className="text-xs text-[#687985]">{moments.length} 張回憶卡片</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{moments.map((moment, index) => { const record = data?.records.find((item) => item.id === moment.careRecordId); return <article key={moment.id} className={`relative min-h-40 rounded-2xl border p-4 shadow-sm transition-transform hover:-translate-y-1 ${index % 2 ? "border-[#b7d3e7] bg-[#f1f7fa]" : "border-[#dcc8af] bg-white"}`}><span className="text-[10px] tracking-[.16em] text-[#5B93C5]">MEMORY NO. {String(moments.length - index).padStart(2, "0")}</span><h4 className="mt-4 font-serif text-lg text-[#263746]">{moment.title}</h4><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#687985]">{moment.note || record?.note}</p><div className="mt-3 flex items-center justify-between text-[10px] text-[#8b918f]"><span>{new Date(record?.recordedAt || moment.createdAt).toLocaleDateString("zh-TW")}</span><button type="button" aria-label={`移除 ${moment.title}`} onClick={() => void remove(moment.id)} className="text-[#a05d51]"><Trash2 size={14} /></button></div></article>; })}</div>{!moments.length && <div className="mt-8 text-center text-[#687985]"><BookHeart size={30} className="mx-auto text-[#5B93C5]" /><p className="mt-3 text-sm">選一筆紀錄，開始收藏毛孩的成長。</p></div>}</div></div>}
  </section>;
}
