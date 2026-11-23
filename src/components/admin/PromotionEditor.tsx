"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, ExternalLink } from "lucide-react";
import { MediaUploadField } from "./MediaUploadField";
import { PromotionPreview } from "./PromotionPreview";
import type { SiteContent } from "@/lib/siteContent";

type Promotion = SiteContent["promotions"][number];
export function PromotionEditor() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    void fetch("/api/admin/content", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.content) throw new Error(data.error || "無法載入活動");
      setContent(data.content); setActiveId(data.content.promotions[0]?.id ?? "");
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const promotions = content?.promotions ?? [];
  const selected = promotions.find((p) => p.id === activeId) ?? promotions[0];
  function edit(patch: Partial<SiteContent>) { setContent((v) => v ? { ...v, ...patch } : v); setDirty(true); setNotice(""); }
  function update(patch: Partial<Promotion>) { edit({ promotions: promotions.map((p) => p.id === selected?.id ? { ...p, ...patch } : p) }); }
  function move(delta: number) {
    const ordered = [...promotions], index = ordered.findIndex((p) => p.id === selected?.id);
    if (index + delta < 0 || index + delta >= ordered.length) return;
    [ordered[index], ordered[index + delta]] = [ordered[index + delta]!, ordered[index]!];
    edit({ promotions: ordered });
  }
  async function save() {
    if (!content) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const fresh = await fetch("/api/admin/content", { cache: "no-store" });
      const data = await fresh.json();
      if (!fresh.ok || !data.content) throw new Error(data.error || "無法讀取目前網站內容");
      const next = { ...data.content, promotions: content.promotions, promotionAutoplay: content.promotionAutoplay, promotionIntervalSeconds: content.promotionIntervalSeconds };
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "儲存失敗");
      setContent(result.content ?? next); setDirty(false); setNotice("已儲存，首頁活動輪播已更新。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "儲存失敗"); }
    finally { setSaving(false); }
  }
  return <div className="mx-auto max-w-[1600px] pb-12 text-[#18344c]">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">站內活動</h1><p className="mt-2 text-sm text-[#647581]">首頁第一屏的活動照片、文字與連結，都在這裡調整。</p></div><div className="flex items-center gap-3"><a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#315f86]">查看首頁<ExternalLink size={16} /></a><button type="button" disabled={!content || saving} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#315f86] px-5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? "儲存中…" : "儲存活動"}</button></div></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-[#e5f0e8] p-4 text-sm text-[#35553a]">{notice}</p>}
    {dirty && <p className="mt-4 text-xs text-[#94604a]">有尚未儲存的變更。</p>}
    {loading ? <p className="mt-8">載入中…</p> : content && <>
      <div className="mt-6 flex flex-wrap items-center gap-5 rounded-xl border border-[#d3e0e7] bg-white p-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={content.promotionAutoplay} onChange={(e) => edit({ promotionAutoplay: e.target.checked })} />自動輪播</label><label className="flex items-center gap-2">每張停留<select aria-label="輪播秒數" value={content.promotionIntervalSeconds} onChange={(e) => edit({ promotionIntervalSeconds: Number(e.target.value) })} className="rounded-lg border border-[#cbdbe5] bg-white px-3 py-2">{[3,5,7,10,15].map((s) => <option key={s} value={s}>{s} 秒</option>)}</select></label><span className="ml-auto text-xs text-[#647581]">啟用 {promotions.filter((p) => p.enabled).length} / {promotions.length} 張</span></div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[190px_minmax(320px,1fr)_minmax(350px,1.1fr)]">
        <aside className="rounded-2xl border border-[#d3e0e7] bg-white p-3"><div className="flex items-center justify-between p-1"><h2 className="text-sm font-bold">活動順序</h2><button type="button" aria-label="新增活動" disabled={promotions.length >= 6} onClick={() => { const next: Promotion = { id: crypto.randomUUID(), title: "新的活動", description: "寫下這次活動的重點。", image: "/images/editorial/shop-living-v2.png", href: "/shop", ctaLabel: "前往看看", enabled: false }; edit({ promotions: [...promotions, next] }); setActiveId(next.id); }} className="grid size-9 place-items-center rounded-full border border-[#cbdbe5] text-[#315f86] disabled:opacity-30"><Plus size={16} /></button></div><div className="mt-3 space-y-2">{promotions.map((p, i) => <button type="button" key={p.id} onClick={() => setActiveId(p.id)} aria-pressed={selected?.id === p.id} className={`w-full overflow-hidden rounded-xl border text-left ${selected?.id === p.id ? "border-[#315f86] bg-[#edf3f6]" : "border-[#e2e8eb]"}`}><div className="relative aspect-[2] bg-[#e5ecee]"><Image src={p.image} alt="" fill sizes="190px" className="object-cover" /></div><span className="block p-3"><strong className="block text-xs leading-5">{i+1}. {p.title}</strong><span className="mt-1 block text-[11px] text-[#647581]">{p.enabled ? "已啟用" : "停用"}</span></span></button>)}</div></aside>
        {selected ? <><section className="rounded-2xl border border-[#d3e0e7] bg-white p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-bold">編輯活動</h2><div className="flex gap-1"><button type="button" aria-label="向前移動" disabled={selected.id === promotions[0]?.id} onClick={() => move(-1)} className="p-2 disabled:opacity-25"><ArrowUp size={17} /></button><button type="button" aria-label="向後移動" disabled={selected.id === promotions.at(-1)?.id} onClick={() => move(1)} className="p-2 disabled:opacity-25"><ArrowDown size={17} /></button><button type="button" aria-label="刪除此活動" onClick={() => { if (window.confirm(`刪除「${selected.title}」？儲存後才會套用。`)) { edit({ promotions: promotions.filter((p) => p.id !== selected.id) }); setActiveId(""); } }} className="p-2 text-rose-600"><Trash2 size={17} /></button></div></div>
          <label className="mt-5 flex items-center gap-3 rounded-xl bg-[#edf3f6] p-3 text-sm"><input type="checkbox" checked={selected.enabled} onChange={(e) => update({ enabled: e.target.checked })} />在首頁顯示這張活動</label>
          <div className="mt-5 space-y-5"><label className="block text-sm font-medium">標題<input className="input" value={selected.title} maxLength={60} onChange={(e) => update({ title: e.target.value })} /></label><label className="block text-sm font-medium">說明<textarea className="input min-h-28" rows={3} value={selected.description} maxLength={180} onChange={(e) => update({ description: e.target.value })} /></label>
            <MediaUploadField label="活動照片" value={selected.image} onChange={(image) => update({ image })} />
            <label className="block text-sm font-medium">按鈕文字<input className="input" value={selected.ctaLabel} maxLength={30} onChange={(e) => update({ ctaLabel: e.target.value })} /></label><label className="block text-sm font-medium">連結路徑<input className="input" list="promotion-paths" value={selected.href} onChange={(e) => update({ href: e.target.value })} /><datalist id="promotion-paths"><option value="/shop" /><option value="/community" /><option value="/care" /><option value="/rewards" /></datalist></label>
          </div></section><PromotionPreview content={content} selectedId={selected.id} /></> : <p className="rounded-xl bg-white p-8 text-sm text-[#647581]">目前沒有活動，按「＋」新增第一張。</p>}
      </div>
    </>}
  </div>;
}
