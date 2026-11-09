"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { CareRecord } from "@/lib/accountTypes";

const categories = [
  { id: "FOOD", label: "飲食", color: "#5b7b63", bg: "#edf4ed" },
  { id: "WEIGHT", label: "體重", color: "#315F86", bg: "#eaf3fa" },
  { id: "ALLERGY", label: "過敏觀察", color: "#a8654c", bg: "#f9eee8" },
  { id: "NOTE", label: "日常備註", color: "#7d7096", bg: "#f3f0f8" },
] as const;

export function CareTimeline({ records, loading, onDelete }: { records: CareRecord[]; loading: boolean; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState<string>("ALL");
  const visible = categories.filter((category) => filter === "ALL" || filter === category.id);
  return <section className="rounded-[22px] border border-[#e1d7cc] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-semibold text-[#263746]">照顧時間軸</h3><p className="mt-1 text-xs text-[#8b918f]">依紀錄類型整理，同類內容會放在一起。</p></div><span className="text-xs text-[#8b918f]">共 {records.length} 筆</span></div><div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="照顧紀錄分類"><button type="button" aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === "ALL" ? "bg-[#315F86] text-white" : "bg-[#f8f5ef] text-[#687985]"}`}>全部</button>{categories.map((category) => <button type="button" key={category.id} aria-pressed={filter === category.id} onClick={() => setFilter(category.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === category.id ? "text-white" : "text-[#687985]"}`} style={{ background: filter === category.id ? category.color : category.bg }}>{category.label} {records.filter((record) => record.kind === category.id).length}</button>)}</div>{loading && <p className="mt-5 text-sm text-[#8b918f]">載入中…</p>}{!loading && records.length === 0 && <p className="mt-5 text-sm text-[#8b918f]">還沒有紀錄，從今天開始寫下第一筆。</p>}<div className="mt-5 max-h-[520px] space-y-5 overflow-y-auto">{visible.map((category) => { const group = records.filter((record) => record.kind === category.id); return <div key={category.id} className="rounded-xl border border-[#e8e9e7] p-4"><div className="flex items-center justify-between"><h4 className="text-sm font-semibold" style={{ color: category.color }}>{category.label}</h4><span className="text-xs text-[#8b918f]">{group.length} 筆</span></div>{group.length === 0 ? <p className="mt-3 text-xs text-[#8b918f]">還沒有{category.label}紀錄。</p> : <div className="mt-3 space-y-3">{group.map((record) => <article key={record.id} className="rounded-lg p-3" style={{ background: category.bg }}><div className="flex items-start justify-between gap-2"><div><strong className="text-sm text-[#263746]">{record.weightKg ? `${record.weightKg} 公斤` : category.label}</strong><p className="mt-1 text-xs text-[#687985]">{new Date(record.recordedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</p></div>{record.kind !== "WEIGHT" && <button type="button" aria-label={`刪除${category.label}紀錄`} onClick={() => onDelete(record.id)} className="text-[#a05d51]"><Trash2 size={15} /></button>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#53616a]">{record.note}</p></article>)}</div>}</div>; })}</div></section>;
}
