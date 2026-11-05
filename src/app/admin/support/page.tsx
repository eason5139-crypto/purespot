"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Headset, RefreshCw } from "lucide-react";

type Ticket = {
  id: string; orderId: string; kind: string; status: string; message: string; response: string | null; createdAt: string; updatedAt: string;
  user: { name: string | null; email: string }; order: { status: string; totalNt: number };
};
const kindName: Record<string, string> = { RETURN: "退換貨", ISSUE: "訂單問題", OTHER: "其他需求" };
const statusName: Record<string, string> = { OPEN: "待處理", IN_PROGRESS: "處理中", RESOLVED: "已完成" };

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeId, setActiveId] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("pending");
  const active = tickets.find((item) => item.id === activeId);

  async function load() {
    try {
      const result = await fetch("/api/admin/support", { cache: "no-store" });
      const data = await result.json() as { requests?: Ticket[]; error?: string };
      if (!result.ok || !data.requests) throw new Error(data.error || "無法載入售後需求");
      setTickets(data.requests);
      if (!activeId && data.requests[0]) setActiveId(data.requests[0].id);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "無法載入售後需求"); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (active) { setResponse(active.response ?? ""); setStatus(active.status); } }, [activeId, active?.updatedAt]);

  async function save() {
    if (!active) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await fetch("/api/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: active.id, status, response: response.trim() || null }) });
      const data = await result.json() as { request?: Ticket; error?: string };
      if (!result.ok || !data.request) throw new Error(data.error || "儲存失敗");
      setTickets((previous) => previous.map((item) => item.id === active.id ? { ...item, ...data.request } : item));
      setNotice("處理狀態與回覆已儲存，會員可在訂單中心查看。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "儲存失敗"); }
    finally { setSaving(false); }
  }

  const visible = tickets.filter((item) => filter === "all" || item.status !== "RESOLVED");
  return <div className="mx-auto max-w-7xl pb-12">
    <header className="rounded-[26px] bg-[#284a63] p-7 text-white sm:p-9"><p className="text-xs font-semibold tracking-[.18em] text-[#b6d9ed]">CUSTOMER CARE</p><h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold"><Headset size={29} />售後需求</h1><p className="mt-3 text-sm text-[#d4e4ec]">集中處理會員提出的訂單問題、退換貨與其他需求。</p></header>
    <div className="mt-6 flex flex-wrap items-center gap-2"><button type="button" aria-pressed={filter === "pending"} onClick={() => setFilter("pending")} className={`rounded-full px-4 py-2 text-sm ${filter === "pending" ? "bg-[#315F86] text-white" : "bg-white text-[#315F86]"}`}>待處理 ({tickets.filter((item) => item.status !== "RESOLVED").length})</button><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={`rounded-full px-4 py-2 text-sm ${filter === "all" ? "bg-[#315F86] text-white" : "bg-white text-[#315F86]"}`}>全部 ({tickets.length})</button><button type="button" onClick={() => void load()} className="ml-auto flex items-center gap-2 rounded-full border border-[#d8d0c6] px-4 py-2 text-sm text-[#315F86]"><RefreshCw size={15} />更新</button></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl bg-[#e8f1f8] p-4 text-sm text-[#315F86]">{notice}</p>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]"><aside className="space-y-2">{visible.map((ticket) => <button key={ticket.id} type="button" onClick={() => setActiveId(ticket.id)} aria-pressed={activeId === ticket.id} className={`w-full rounded-2xl border p-4 text-left ${activeId === ticket.id ? "border-[#5B93C5] bg-[#e8f1f8]" : "border-[#e8ded3] bg-white"}`}><span className="text-xs font-semibold text-[#5B93C5]">{kindName[ticket.kind]} · {statusName[ticket.status]}</span><strong className="mt-2 block text-sm text-[#302b26]">{ticket.user.name || ticket.user.email}</strong><span className="mt-2 block text-xs text-[#82776d]">訂單 {ticket.orderId.slice(0, 8)} · {new Date(ticket.createdAt).toLocaleDateString("zh-TW")}</span></button>)}{visible.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#82776d]">目前沒有符合的需求。</p>}</aside>
    {active && <section className="rounded-2xl border border-[#e8ded3] bg-white p-6 sm:p-8"><p className="text-xs font-semibold tracking-wider text-[#5B93C5]">{kindName[active.kind]} · 訂單 {active.orderId}</p><h2 className="mt-3 text-xl font-semibold text-[#302b26]">{active.user.name || active.user.email}</h2><p className="mt-1 text-sm text-[#82776d]">{active.user.email} · 訂單金額 NT$ {active.order.totalNt.toLocaleString("zh-TW")}</p><div className="mt-6 rounded-xl bg-[#f8f5ef] p-5 text-sm leading-7 text-[#4b443d] whitespace-pre-wrap">{active.message}</div><div className="mt-7 grid gap-5 sm:grid-cols-[180px_1fr]"><label className="text-sm font-medium text-[#302b26]">處理狀態<select value={status} onChange={(event) => setStatus(event.target.value)} className="input mt-2"><option value="OPEN">待處理</option><option value="IN_PROGRESS">處理中</option><option value="RESOLVED">已完成</option></select></label><label className="text-sm font-medium text-[#302b26]">給會員的回覆<textarea value={response} onChange={(event) => setResponse(event.target.value)} maxLength={1000} rows={5} placeholder="寫下處理結果或接下來的步驟" className="input mt-2 min-h-32" /></label></div><button type="button" disabled={saving} onClick={() => void save()} className="mt-6 flex min-h-12 items-center gap-2 rounded-xl bg-[#315F86] px-6 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={17} />{saving ? "儲存中…" : "儲存處理結果"}</button></section>}</div>
  </div>;
}
