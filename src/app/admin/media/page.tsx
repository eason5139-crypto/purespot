"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Copy, Images, Search, Sparkles } from "lucide-react";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import type { SiteContent } from "@/lib/siteContent";

const placements = [
  { key: "heroImage", label: "首頁主視覺" },
  { key: "shopImage", label: "商城區形象照" },
  { key: "communityImage", label: "社群區形象照" },
] as const;

function isUploaded(url: string) { return url.startsWith("/uploads/") || url.startsWith("https://"); }

export default function AdminMediaPage() {
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState<"all" | "uploaded" | "bundled">("all");
  const [search, setSearch] = useState("");
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/media", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { images?: string[]; error?: string };
        if (!response.ok) throw new Error(data.error || "無法載入媒體庫");
        setImages(data.images ?? []);
        setSelected((current) => current || data.images?.[0] || "");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "無法載入媒體庫"));
  }, []);

  const visible = images.filter((url) =>
    (filter === "all" || (filter === "uploaded" ? isUploaded(url) : !isUploaded(url))) &&
    (!search.trim() || url.toLowerCase().includes(search.trim().toLowerCase()))
  );

  async function applyImage(key: typeof placements[number]["key"]) {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const current = await fetch("/api/admin/content", { cache: "no-store" });
      const currentData = await current.json() as { content?: SiteContent; error?: string };
      if (!current.ok || !currentData.content) throw new Error(currentData.error || "無法讀取網站內容");
      const next = { ...currentData.content, [key]: selected };
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "套用圖片失敗");
      setSiteContent(next);
      setNotice(`已套用到${placements.find((item) => item.key === key)?.label}，官網已更新。`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "套用圖片失敗"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-[1450px]">
      <div className="rounded-[28px] bg-[#284a63] px-6 py-8 text-[#f7f3e9] sm:px-9 sm:py-10">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[.2em] text-[#bcdbea]"><Sparkles size={16} /> VISUAL LIBRARY</p>
        <h1 className="editorial-title mt-3 text-3xl sm:text-4xl">圖片媒體庫</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d5e4eb]">上傳照片、挑選圖片，再決定要放在哪裡。首頁圖片可以直接套用；商品圖片請到商品編輯器選擇。</p>
      </div>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_370px]"><div>
      <div className="rounded-2xl border border-[#e8ded3] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#302b26]">1 · 上傳圖片</h2>
        <MediaUploadField
          label="新增圖片"
          value={selected}
          onChange={(url) => { setImages((previous) => [url, ...previous.filter((item) => item !== url)]); setSelected(url); setNotice("圖片已上傳。請在右側選擇使用位置。"); }}
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Images size={20} className="text-[#5B93C5]" />
        <h2 className="text-xl font-semibold text-[#302b26]">2 · 選一張圖片</h2>
        <span className="text-sm text-[#8a7f75]">({visible.length})</span>
        <label className="ml-auto flex min-h-10 items-center gap-2 rounded-xl border border-[#e8ded3] bg-white px-3 text-[#8a7f75]"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋圖片名稱" aria-label="搜尋圖片名稱" className="w-36 bg-transparent text-sm text-[#302b26] outline-none" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="圖片來源篩選">{([["all", "全部圖片"], ["uploaded", "我上傳的"], ["bundled", "網站內建"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === key ? "bg-[#315F86] text-white" : "bg-white text-[#675e53] hover:bg-[#e8f1f8]"}`}>{label}</button>)}</div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map((url) => <button key={url} type="button" aria-label={`選取圖片 ${url.split("/").at(-1)}`} aria-pressed={selected === url} onClick={() => { setSelected(url); setNotice(""); }} className={`group overflow-hidden rounded-xl border-2 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${selected === url ? "border-[#5B93C5] shadow-md" : "border-transparent hover:border-[#b8d1e4]"}`}><span className="relative block aspect-[1.2] bg-[#f5f1eb]"><Image src={url} alt="" fill sizes="200px" className="object-cover" />{selected === url && <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#315F86] text-white"><Check size={15} /></span>}</span><span className="block truncate px-2 py-2 text-[11px] text-[#675e53]">{url.split("/").at(-1)}</span></button>)}</div>
      {visible.length === 0 && <p className="py-10 text-center text-sm text-[#8a7f75]">找不到符合的圖片</p>}
      </div>
      <aside className="rounded-[24px] border border-[#cbd7df] bg-[#f8fbfc] p-5 shadow-[0_24px_60px_-40px_rgba(25,56,77,.55)] xl:sticky xl:top-6">
        <h2 className="font-semibold text-[#263746]">3 · 預覽並套用</h2><p className="mt-1 text-xs leading-5 text-[#687985]">選取左側圖片後，指定要顯示的位置。</p>
        <div className="relative mt-4 aspect-[1.3] overflow-hidden rounded-xl bg-[#e7e2d7]">{selected ? <Image src={selected} alt="目前選取的圖片" fill sizes="370px" className="object-contain" /> : <div className="flex size-full items-center justify-center text-[#8a7f75]">請先選擇圖片</div>}</div>
        <p className="mt-3 break-all text-xs text-[#687985]">{selected || "尚未選擇"}</p>
        <div className="mt-5 space-y-2">{placements.map((place) => <button key={place.key} type="button" disabled={!selected || busy} onClick={() => void applyImage(place.key)} className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-[#d5e2eb] bg-white px-4 text-left text-sm font-semibold text-[#315F86] hover:border-[#5B93C5] hover:bg-[#eef6fb] disabled:opacity-50">套用到{place.label}{siteContent?.[place.key] === selected && <span className="rounded-full bg-[#e8f1f8] px-2 py-1 text-[10px]">使用中</span>}</button>)}</div>
        <p className="mt-5 border-t border-[#d5e2eb] pt-4 text-xs leading-6 text-[#687985]">要放在商品詳情？前往 <Link href="/admin/products" className="font-semibold text-[#315F86] underline">商品管理</Link>。文字與更多圖片設定在 <Link href="/admin/content" className="font-semibold text-[#315F86] underline">網站內容編輯</Link>。</p>
        <button type="button" disabled={!selected} onClick={async () => { try { await navigator.clipboard.writeText(selected); setCopied(selected); setNotice("圖片網址已複製。"); } catch { setError("無法複製，請檢查瀏覽器權限。"); } }} className="mt-3 flex min-h-10 items-center gap-2 text-xs font-semibold text-[#315F86] hover:underline disabled:opacity-40">{copied === selected ? <Check size={14} /> : <Copy size={14} />}複製圖片網址</button>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-[#bcd5e9] bg-[#e8f1f8] p-3 text-sm text-[#315F86]">{notice}</p>}
      </aside></div>
    </div>
  );
}
