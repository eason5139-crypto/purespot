"use client";

import { useEffect, useState } from "react";
import { Bell, BookHeart, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest, type CareRecord, type CareReminder } from "@/lib/accountTypes";
import { usePetContextStore } from "@/store/usePetContextStore";
import { CareTimeline } from "./CareTimeline";

export function AccountCare() {
  const allPets = usePetContextStore((state) => state.allPets);
  const pets = allPets.filter((pet) => Boolean(pet.cloudId));
  const [petId, setPetId] = useState("");
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [kind, setKind] = useState("FOOD");
  const [note, setNote] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [repeatDays, setRepeatDays] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!petId && pets[0]?.cloudId) setPetId(pets[0].cloudId); }, [petId, pets]);

  async function load() {
    try {
      const data = await accountJson<{ records: CareRecord[]; reminders: CareReminder[] }>("/api/account/care");
      setRecords(data.records); setReminders(data.reminders); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "照顧紀錄暫時無法載入"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function addRecord() {
    if (!petId) { setError("請先選擇毛孩"); return; }
    setBusy(true); setError("");
    try {
      const value = kind === "WEIGHT" ? Number(weightKg) : null;
      await accountJson("/api/account/care", jsonRequest("POST", { action: "record", petId, kind, note: note.trim() || (kind === "WEIGHT" ? "體重紀錄" : ""), weightKg: value }));
      if (kind === "WEIGHT" && value) {
        const local = allPets.find((pet) => pet.cloudId === petId);
        if (local) usePetContextStore.getState().updatePet(local.id, { weightKg: value });
      }
      setNote(""); setWeightKg(""); await load(); toast.success("照顧紀錄已保存");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "紀錄儲存失敗"); }
    finally { setBusy(false); }
  }
  async function addReminder() {
    if (!petId || !dueAt) { setError("請選擇毛孩與提醒時間"); return; }
    setBusy(true); setError("");
    try {
      await accountJson("/api/account/care", jsonRequest("POST", { action: "reminder", petId, title: reminderTitle, dueAt: new Date(dueAt).toISOString(), repeatDays: repeatDays ? Number(repeatDays) : null }));
      setReminderTitle(""); setDueAt(""); setRepeatDays(""); await load(); toast.success("提醒已設定");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "提醒設定失敗"); }
    finally { setBusy(false); }
  }
  async function act(method: "PATCH" | "DELETE", id: string, type?: "record" | "reminder") {
    try { await accountJson("/api/account/care", jsonRequest(method, method === "PATCH" ? { id } : { id, type })); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失敗"); }
  }

  const filteredRecords = records.filter((record) => record.petId === petId);
  const filteredReminders = reminders.filter((reminder) => reminder.petId === petId && !reminder.completedAt);
  return <section className="space-y-6"><header><p className="text-xs font-semibold tracking-[.18em] text-[#5B93C5]">CARE JOURNAL</p><h2 className="editorial-title mt-2 text-3xl text-[#263746]">毛孩照顧紀錄</h2><p className="mt-2 text-sm leading-6 text-[#687985]">將體重、飲食與生活觀察留在同一處，並安排下一次要記得的事。</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2">{pets.map((pet) => <button type="button" key={pet.id} onClick={() => setPetId(pet.cloudId!)} aria-pressed={petId === pet.cloudId} className={`rounded-full px-4 py-2 text-sm font-semibold ${petId === pet.cloudId ? "bg-[#315F86] text-white" : "bg-white text-[#315F86]"}`}>{pet.name}</button>)}</div>
    {pets.length === 0 && <p className="rounded-2xl bg-white p-6 text-sm text-[#687985]">毛孩檔案同步後，就能開始記錄。</p>}
    {petId && <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-[22px] border border-[#e1d7cc] bg-white p-5 sm:p-7"><h3 className="flex items-center gap-2 text-lg font-semibold text-[#263746]"><BookHeart size={19} className="text-[#5B93C5]" />新增照顧紀錄</h3><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-[#687985]">紀錄類型<select value={kind} onChange={(event) => setKind(event.target.value)} className="input mt-1"><option value="FOOD">飲食</option><option value="WEIGHT">體重</option><option value="ALLERGY">過敏觀察</option><option value="NOTE">日常備註</option></select></label>{kind === "WEIGHT" && <label className="text-xs font-medium text-[#687985]">體重（公斤）<input type="number" step="0.01" min="0.02" max="90" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className="input mt-1" /></label>}</div><label className="mt-4 block text-xs font-medium text-[#687985]">內容<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder={kind === "WEIGHT" ? "例：早上量測，精神與食慾正常" : "記下今天的份量、狀況或發現"} className="input mt-1 min-h-24" /></label><button type="button" disabled={busy || (kind === "WEIGHT" ? !weightKg : !note.trim())} onClick={() => void addRecord()} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-[#315F86] px-5 text-sm font-semibold text-white disabled:opacity-40"><Plus size={16} />儲存紀錄</button><p className="mt-3 text-xs leading-5 text-[#8b918f]">體重會同步更新毛孩檔案；過敏觀察的文字不會自動改動商品適配設定。</p></section>
      <section className="rounded-[22px] border border-[#e1d7cc] bg-white p-5 sm:p-7"><h3 className="flex items-center gap-2 text-lg font-semibold text-[#263746]"><Bell size={19} className="text-[#5B93C5]" />安排照顧提醒</h3><label className="mt-5 block text-xs font-medium text-[#687985]">要記得的事<input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} maxLength={100} placeholder="例如：量體重、準備下一包主食" className="input mt-1" /></label><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-[#687985]">提醒時間<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="input mt-1" /></label><label className="text-xs font-medium text-[#687985]">重複週期<select value={repeatDays} onChange={(event) => setRepeatDays(event.target.value)} className="input mt-1"><option value="">不重複</option><option value="7">每 7 天</option><option value="14">每 14 天</option><option value="30">每 30 天</option></select></label></div><button type="button" disabled={busy || !reminderTitle.trim() || !dueAt} onClick={() => void addReminder()} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-[#315F86] px-5 text-sm font-semibold text-white disabled:opacity-40"><Plus size={16} />加入提醒</button><p className="mt-3 text-xs text-[#8b918f]">到期的提醒會出現在帳戶節奏板。</p></section></div>}
    {petId && <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-[22px] border border-[#e1d7cc] bg-white p-5 sm:p-7"><h3 className="font-semibold text-[#263746]">接下來要做的事</h3>{filteredReminders.length === 0 && <p className="mt-4 text-sm text-[#8b918f]">目前沒有待辦提醒。</p>}<div className="mt-3 space-y-2">{filteredReminders.map((reminder) => <div key={reminder.id} className="flex items-start gap-3 rounded-xl bg-[#f8f5ef] p-3"><span className="min-w-0 flex-1"><strong className="block text-sm text-[#263746]">{reminder.title}</strong><span className="mt-1 block text-xs text-[#8b918f]">{new Date(reminder.dueAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}{reminder.repeatDays ? ` · 每 ${reminder.repeatDays} 天` : ""}</span></span><button type="button" title="完成" aria-label={`完成提醒 ${reminder.title}`} onClick={() => void act("PATCH", reminder.id)} className="grid size-9 place-items-center rounded-full bg-[#e8f1f8] text-[#315F86]"><Check size={17} /></button><button type="button" title="刪除" aria-label={`刪除提醒 ${reminder.title}`} onClick={() => void act("DELETE", reminder.id, "reminder")} className="grid size-9 place-items-center rounded-full text-[#a05d51]"><Trash2 size={16} /></button></div>)}</div></section><CareTimeline records={filteredRecords} loading={loading} onDelete={(id) => void act("DELETE", id, "record")} /></div>}
  </section>;
}
