"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import type { SiteContent } from "@/lib/siteContent";

type Promotion = SiteContent["promotions"][number];

export default function AdminPromotionsPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void fetch("/api/admin/content", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { content?: SiteContent; error?: string };
      if (!response.ok || !data.content) throw new Error(data.error || "無法載入活動");
      setContent(data.content);
      setActiveId(data.content.promotions[0]?.id ?? "");
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "無法載入活動")).finally(() => setLoading(false));
  }, []);

  const promotions = content?.promotions ?? [];
  const selected = promotions.find((item) => item.id === activeId) ?? promotions[0];

  function update(id: string, patch: Partial<Promotion>) {
    setContent((current) => current ? { ...current, promotions: current.promotions.map((item) => item.id === id ? { ...item, ...patch } : item) } : current);
    setNotice("");
  }

  function add() {
    if (!content || promotions.length >= 6) return;
    const next: Promotion = { id: crypto.randomUUID(), title: "新的活動提案", description: "寫下這張活動卡要傳達的重點。", image: "/images/editorial/shop-living-v2.png", ctaLabel: "前往看看", href: "/shop", enabled: false };
    setContent({ ...content, promotions: [...promotions, next] });
    setActiveId(next.id); setNotice("");
  }

  function move(id: string, direction: -1 | 1) {
    if (!content) return;
    const index = promotions.findIndex((item) => item.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= promotions.length) return;
    const ordered = [...promotions];
    [ordered[index], ordered[destination]] = [ordered[destination]!, ordered[index]!];
    setContent({ ...content, promotions: ordered }); setNotice("");
  }

  async function save() {
    if (!content) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const fresh = await fetch("/api/admin/content", { cache: "no-store" });
      const freshData = await fresh.json() as { content?: SiteContent; error?: string };
      if (!fresh.ok || !freshData.content) throw new Error(freshData.error || "無法取得目前網站內容");
      const next = { ...freshData.content, promotions: content.promotions };
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "儲存失敗");
      setContent(next);
      setNotice("站內活動已儲存。訪客下次進入首頁或商城時會看到啟用中的活動。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "儲存失敗"); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-7xl pb-12">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow text-[#5B93C5]">活動內容</span><h1 className="mt-2 text-3xl font-semibold text-[#302b26]">站內活動管理</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#675e53]">訪客進入首頁或商城時可看見活動輪播。每張卡片都能設定照片、文字、按鈕連結與是否啟用。</p></div><Button onClick={() => void save()} disabled={!content || saving} className="gap-2"><Save size={16} />{saving ? "儲存中…" : "儲存活動"}</Button></div>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl border border-[#bcd5e9] bg-[#e8f1f8] p-4 text-sm text-[#315F86]">{notice}</p>}
    {loading ? <p className="mt-8 text-sm text-[#8a7f75]">載入活動中…</p> : <div className="mt-7 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="self-start rounded-2xl border border-[#e8ded3] bg-white p-4 shadow-sm lg:sticky lg:top-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-[#302b26]">活動順序</h2><button type="button" disabled={promotions.length >= 6} onClick={add} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#315F86] hover:bg-[#e8f1f8] disabled:opacity-50"><Plus size={15} />新增</button></div><div className="space-y-2">{promotions.map((item, index) => <button key={item.id} type="button" onClick={() => setActiveId(item.id)} aria-pressed={selected?.id === item.id} className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-2 text-left ${selected?.id === item.id ? "border-[#5B93C5] bg-[#e8f1f8]" : "border-[#e8ded3] hover:bg-[#f8f5ef]"}`}><span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-[#e9e3d9]"><Image src={item.image} alt="" fill sizes="48px" className="object-cover" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#302b26]">{index + 1}. {item.title}</strong><span className="mt-1 block text-xs text-[#796f65]">{item.enabled ? "對訪客顯示" : "暫停顯示"}</span></span></button>)}</div><p className="mt-4 text-xs leading-5 text-[#8a7f75]">最多 6 張。停用的卡片會保留在後台，訪客不會看到。</p></aside>
      {selected && <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><section className="rounded-2xl border border-[#e8ded3] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold text-[#302b26]">編輯活動卡片</h2><div className="flex gap-1"><button type="button" aria-label="向前移動" disabled={promotions[0]?.id === selected.id} onClick={() => move(selected.id, -1)} className="rounded-lg p-2 text-[#315F86] hover:bg-[#e8f1f8] disabled:opacity-30"><ArrowUp size={17} /></button><button type="button" aria-label="向後移動" disabled={promotions.at(-1)?.id === selected.id} onClick={() => move(selected.id, 1)} className="rounded-lg p-2 text-[#315F86] hover:bg-[#e8f1f8] disabled:opacity-30"><ArrowDown size={17} /></button><button type="button" aria-label="刪除此活動" onClick={() => { if (!content) return; const next = promotions.filter((item) => item.id !== selected.id); setContent({ ...content, promotions: next }); setActiveId(next[0]?.id ?? ""); }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={17} /></button></div></div>
        <label className="mt-5 flex items-center gap-3 rounded-xl bg-[#f3f8fb] p-4 text-sm font-semibold text-[#315F86]"><input type="checkbox" checked={selected.enabled} onChange={(event) => update(selected.id, { enabled: event.target.checked })} className="size-4 accent-[#315F86]" />{selected.enabled ? "已啟用，訪客會看到" : "目前停用，只在後台保留"}</label>
        <div className="mt-5 space-y-5"><label className="block text-sm font-medium text-[#302b26]">主標題<input value={selected.title} maxLength={60} onChange={(event) => update(selected.id, { title: event.target.value })} className="input mt-2" /></label><label className="block text-sm font-medium text-[#302b26]">短說明<textarea value={selected.description} maxLength={180} rows={3} onChange={(event) => update(selected.id, { description: event.target.value })} className="input mt-2 min-h-24" /></label><MediaUploadField label="活動照片" value={selected.image} onChange={(url) => update(selected.id, { image: url })} /><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-[#302b26]">按鈕文字<input value={selected.ctaLabel} maxLength={30} onChange={(event) => update(selected.id, { ctaLabel: event.target.value })} className="input mt-2" /></label><label className="block text-sm font-medium text-[#302b26]">按下後前往<input value={selected.href} list="promotion-paths" onChange={(event) => update(selected.id, { href: event.target.value })} className="input mt-2" /><datalist id="promotion-paths"><option value="/shop" /><option value="/community" /><option value="/care" /><option value="/autoship" /></datalist></label></div><p className="text-xs text-[#8a7f75]">只能填本站網址，例如 /shop、/community；不會導向外部網站。</p></div>
      </section><aside className="overflow-hidden rounded-[22px] border border-[#d7e3eb] bg-white shadow-lg"><div className="relative aspect-[1.15] bg-[#e6e0d5]"><Image src={selected.image} alt="活動預覽" fill sizes="320px" className="object-cover" /></div><div className="p-5"><p className="text-[10px] font-bold tracking-[.18em] text-[#5B93C5]">PURESPOT PICKS</p><h3 className="editorial-title mt-3 text-2xl leading-snug text-[#263746]">{selected.title || "活動標題"}</h3><p className="mt-3 text-sm leading-6 text-[#687985]">{selected.description || "活動說明"}</p><span className="mt-5 inline-block rounded-lg bg-[#315F86] px-4 py-2 text-xs font-semibold text-white">{selected.ctaLabel || "前往看看"}</span></div></aside></div>}
    </div>}
  </div>;
}
