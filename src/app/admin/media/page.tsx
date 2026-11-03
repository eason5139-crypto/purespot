"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, ImagePlus, Images, Package, Search, UploadCloud } from "lucide-react";
import type { SiteContent } from "@/lib/siteContent";

const locations = [
  { key: "heroImage", name: "首頁第一張大照片", detail: "訪客一進網站最先看到", href: "/" },
  { key: "shopImage", name: "商城形象照片", detail: "商城上方與首頁選物區", href: "/shop" },
  { key: "communityImage", name: "社群形象照片", detail: "首頁毛孩日常區", href: "/community" },
] as const;
type Location = typeof locations[number]["key"];
type Source = "all" | "uploaded" | "bundled";
const isUploaded = (url: string) => url.startsWith("/uploads/") || url.startsWith("https://");
const fileName = (url: string) => decodeURIComponent(url.split("/").at(-1)?.split("?")[0] ?? "圖片");

export default function AdminMediaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [location, setLocation] = useState<Location>("heroImage");
  const [selected, setSelected] = useState("");
  const [source, setSource] = useState<Source>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/media", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { images?: string[]; error?: string };
        if (!response.ok || !data.images) throw new Error(data.error || "無法載入圖片");
        return data.images;
      }),
      fetch("/api/admin/content", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { content?: SiteContent; error?: string };
        if (!response.ok || !data.content) throw new Error(data.error || "無法讀取網站圖片設定");
        return data.content;
      }),
    ]).then(([urls, current]) => {
      setImages([...new Set([...Object.values(current).filter((value): value is string => typeof value === "string" && (value.startsWith("/images/") || value.startsWith("/uploads/") || value.startsWith("https://"))), ...urls])]);
      setContent(current);
      setSelected(current.heroImage);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "圖片載入失敗"));
  }, []);

  const imageUsage = (url: string) => [
    ...locations.filter((item) => content?.[item.key] === url).map((item) => item.name),
    ...(content?.promotions.some((item) => item.image === url) ? ["站內活動"] : []),
  ];
  const visible = images.filter((url) => (source === "all" || (source === "uploaded" ? isUploaded(url) : !isUploaded(url))) && (!search.trim() || `${url} ${imageUsage(url).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase())));
  const currentImage = content?.[location] ?? "";
  const currentLocation = locations.find((item) => item.key === location)!;

  function chooseLocation(next: Location) {
    setLocation(next);
    setSelected(content?.[next] ?? "");
    setNotice(""); setError("");
  }

  async function upload(file: File) {
    setError(""); setNotice("");
    if (file.size > 4 * 1024 * 1024) { setError("圖片不可超過 4 MB"); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "圖片上傳失敗");
      setImages((previous) => [data.url!, ...previous.filter((url) => url !== data.url)]);
      setSelected(data.url);
      setSource("all"); setSearch("");
      setNotice("上傳完成。右側可先比較新舊照片，再確認更換。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "圖片上傳失敗"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function apply() {
    if (!selected || !content || selected === currentImage) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/content", { cache: "no-store" });
      const data = await response.json() as { content?: SiteContent; error?: string };
      if (!response.ok || !data.content) throw new Error(data.error || "無法讀取目前網站設定");
      const next = { ...data.content, [location]: selected };
      const saved = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const result = await saved.json() as { error?: string };
      if (!saved.ok) throw new Error(result.error || "更換失敗");
      setContent(next);
      setNotice(`已更換${currentLocation.name}。開啟網站即可看到。`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "更換失敗"); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-[1450px] pb-12">
    <div className="rounded-[28px] bg-[#284a63] px-6 py-8 text-[#f7f3e9] sm:px-9 sm:py-10">
      <p className="text-[11px] font-bold tracking-[.2em] text-[#bcdbea]">PURESPOT · IMAGE DESK</p>
      <h1 className="editorial-title mt-3 text-3xl sm:text-4xl">網站圖片管理</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d5e4eb]">在這裡更換網站的形象照片。依序選「要改的位置」→「新照片」→「確認更換」。商品照片在商品管理逐項修改。</p>
    </div>

    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-[22px] border border-[#e8ded3] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#302b26]">① 你要改哪一張？</h2>
          <p className="mt-1 text-sm text-[#796f65]">先選網站上的位置，右邊會顯示目前使用的照片。</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">{locations.map((item) => <button key={item.key} type="button" aria-pressed={location === item.key} onClick={() => chooseLocation(item.key)} className={`overflow-hidden rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 ${location === item.key ? "border-[#5B93C5] bg-[#f0f7fc] shadow-sm" : "border-[#e8ded3] bg-[#fbf8f4] hover:border-[#abc9df]"}`}><span className="relative block aspect-[1.65] bg-[#e9e3d9]">{content?.[item.key] && <Image src={content[item.key]} alt="" fill sizes="260px" className="object-cover" />}</span><span className="block p-3"><strong className="block text-sm text-[#302b26]">{item.name}</strong><span className="mt-1 block text-[11px] text-[#796f65]">{item.detail}</span></span></button>)}</div>
          <Link href="/admin/products" className="mt-4 flex min-h-12 items-center justify-between rounded-xl border border-[#dbe6ed] bg-[#f7fbfd] px-4 text-sm text-[#315F86] hover:bg-[#e8f1f8]"><span className="flex items-center gap-2 font-semibold"><Package size={17} />要換商品照片？到商品管理逐項選圖</span><ChevronRight size={17} /></Link>
        </section>

        <section className="rounded-[22px] border border-[#e8ded3] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#302b26]">② 選擇新照片</h2>
          <p className="mt-1 text-sm text-[#796f65]">可上傳自己的照片，也可選網站內建圖片。點一下縮圖就能在右邊預覽。</p>
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files[0]) void upload(event.dataTransfer.files[0]); }} className="mt-5 flex min-h-24 w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#a8c5d9] bg-[#f3f8fb] px-5 text-sm font-semibold text-[#315F86] hover:bg-[#e8f1f8] disabled:opacity-50"><UploadCloud size={23} />{busy ? "處理中…" : "上傳照片，或把檔案拖到這裡"}<span className="text-xs font-normal text-[#71808d]">PNG / JPG / WebP · 4 MB 內</span></button>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          <div className="mt-6 flex flex-wrap items-center gap-3"><Images size={18} className="text-[#5B93C5]" /><h3 className="font-semibold text-[#302b26]">可用圖片</h3><span className="text-xs text-[#8a7f75]">{visible.length} 張</span><label className="ml-auto flex min-h-10 items-center gap-2 rounded-xl border border-[#e8ded3] px-3 text-[#8a7f75]"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="搜尋圖片" placeholder="搜尋檔名" className="w-32 bg-transparent text-sm text-[#302b26] outline-none" /></label></div>
          <div className="mt-3 flex gap-2" role="group" aria-label="圖片來源">{([["all", "全部"], ["uploaded", "我上傳的"], ["bundled", "網站內建"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={source === value} onClick={() => setSource(value)} className={`rounded-full px-4 py-2 text-xs font-semibold ${source === value ? "bg-[#315F86] text-white" : "bg-[#f2f0ec] text-[#675e53] hover:bg-[#e8f1f8]"}`}>{label}</button>)}</div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map((url) => <button key={url} type="button" aria-label={`選取圖片 ${fileName(url)}`} aria-pressed={selected === url} onClick={() => { setSelected(url); setNotice(""); }} className={`overflow-hidden rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 ${selected === url ? "border-[#5B93C5] shadow-sm" : "border-transparent hover:border-[#c0d8e9]"}`}><span className="relative block aspect-[1.3] bg-[#e8e3d9]"><Image src={url} alt="" fill sizes="200px" className="object-cover" />{selected === url && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[#315F86] text-white"><Check size={15} /></span>}{imageUsage(url).length > 0 && <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#315F86]">目前用於：{imageUsage(url).join("、")}</span>}</span><span className="block truncate bg-[#f9f7f4] px-2 py-2 text-[11px] text-[#675e53]">{fileName(url)}</span></button>)}</div>
          {visible.length === 0 && <p className="py-10 text-center text-sm text-[#8a7f75]">這個篩選沒有圖片</p>}
        </section>
      </div>

      <aside className="self-start rounded-[24px] border border-[#cbd7df] bg-[#f8fbfc] p-5 shadow-[0_24px_60px_-40px_rgba(25,56,77,.5)] xl:sticky xl:top-6">
        <h2 className="text-lg font-semibold text-[#263746]">③ 確認更換</h2>
        <p className="mt-1 text-xs leading-5 text-[#687985]">{currentLocation.name} · 先比較新舊照片，確認後才會更新網站。</p>
        <div className="mt-5 grid grid-cols-2 gap-3">{([["目前網站", currentImage], ["準備換成", selected]] as const).map(([label, url]) => <div key={label}><p className="mb-2 text-xs font-semibold text-[#315F86]">{label}</p><div className="relative aspect-square overflow-hidden rounded-xl bg-[#e9e3d9]">{url ? <Image src={url} alt={label} fill sizes="160px" className="object-cover" /> : <span className="grid size-full place-items-center text-xs text-[#8a7f75]">尚未選圖</span>}</div><p className="mt-1 truncate text-[10px] text-[#8a7f75]">{url ? fileName(url) : ""}</p></div>)}</div>
        <button type="button" disabled={busy || !selected || selected === currentImage} onClick={() => void apply()} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#315F86] px-4 text-sm font-semibold text-white hover:bg-[#244b6b] disabled:cursor-not-allowed disabled:opacity-45"><ImagePlus size={17} />{busy ? "更換中…" : selected === currentImage ? "目前已是這張照片" : `確認更換${currentLocation.name}`}</button>
        <Link href={currentLocation.href} target="_blank" className="mt-3 flex min-h-10 items-center justify-center text-xs font-semibold text-[#315F86] underline">開啟網站查看位置</Link>
        <p className="mt-4 border-t border-[#d5e2eb] pt-4 text-xs leading-6 text-[#687985]">也可以到 <Link href="/admin/content" className="font-semibold text-[#315F86] underline">網站內容編輯</Link>，同時調整文字並預覽手機、平板、電腦畫面。</p>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-[#bcd5e9] bg-[#e8f1f8] p-3 text-sm text-[#315F86]">{notice}</p>}
      </aside>
    </div>
  </div>;
}
