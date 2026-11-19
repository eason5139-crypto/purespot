"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, ImagePlus, Images, Package, Search, UploadCloud } from "lucide-react";
import type { SiteContent } from "@/lib/siteContent";

const locations = [
  { key: "heroImage", name: "首頁第一張大照片", detail: "訪客一進網站最先看到", href: "/" },
  { key: "shopImage", name: "商城形象照片", detail: "商城上方與首頁選物區", href: "/shop" },
  { key: "communityImage", name: "社群形象照片", detail: "首頁毛孩社群區", href: "/community" },
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
    <h1 className="text-2xl font-bold text-[#302b26]">網站圖片</h1>

    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-[#302b26]">位置選擇</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{locations.map((item) => <button key={item.key} type="button" aria-pressed={location === item.key} onClick={() => chooseLocation(item.key)} className={`overflow-hidden rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 ${location === item.key ? "border-[#935941] bg-[#fdf5ec] shadow-2xs" : "border-[#e8ded3] bg-[#fbf8f4] hover:border-[#cfb8a1]"}`}><span className="relative block aspect-[1.65] bg-[#e9e3d9]">{content?.[item.key] && <Image src={content[item.key]} alt="" fill sizes="260px" className="object-cover" />}</span><span className="block p-3"><strong className="block text-sm text-[#302b26]">{item.name}</strong></span></button>)}</div>
          <Link href="/admin/products" className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-[#e5d8c8] bg-[#faf6f0] px-4 text-sm text-[#935941] hover:bg-[#f4ece2]"><span className="flex items-center gap-2 font-semibold"><Package size={16} />商品圖片請至商品管理</span><ChevronRight size={16} /></Link>
        </section>

        <section className="rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-[#302b26]">選擇圖片</h2>
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files[0]) void upload(event.dataTransfer.files[0]); }} className="mt-4 flex min-h-24 w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#d8c4ae] bg-[#faf6f0] px-5 text-sm font-semibold text-[#935941] hover:bg-[#f4ece2] disabled:opacity-50"><UploadCloud size={22} />{busy ? "處理中…" : "上傳圖片"}<span className="text-xs font-normal text-[#8a7c6e]">PNG / JPG / WebP · 4 MB</span></button>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          <div className="mt-6 flex flex-wrap items-center gap-3"><Images size={18} className="text-[#935941]" /><h3 className="font-semibold text-[#302b26]">圖庫</h3><span className="text-xs text-[#8a7f75]">{visible.length} 張</span><label className="ml-auto flex min-h-10 items-center gap-2 rounded-xl border border-[#e8ded3] px-3 text-[#8a7f75]"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="搜尋圖片" placeholder="搜尋檔名" className="w-32 bg-transparent text-sm text-[#302b26] outline-none" /></label></div>
          <div className="mt-3 flex gap-2" role="group" aria-label="圖片來源">{([["all", "全部"], ["uploaded", "已上傳"], ["bundled", "內建"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={source === value} onClick={() => setSource(value)} className={`rounded-full px-4 py-2 text-xs font-semibold ${source === value ? "bg-[#935941] text-white" : "bg-[#f2f0ec] text-[#675e53] hover:bg-[#f4ece2]"}`}>{label}</button>)}</div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map((url) => <button key={url} type="button" aria-label={`選取圖片 ${fileName(url)}`} aria-pressed={selected === url} onClick={() => { setSelected(url); setNotice(""); }} className={`overflow-hidden rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 ${selected === url ? "border-[#935941] shadow-2xs" : "border-transparent hover:border-[#d8c4ae]"}`}><span className="relative block aspect-[1.3] bg-[#e8e3d9]"><Image src={url} alt="" fill sizes="200px" className="object-cover" />{selected === url && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[#935941] text-white"><Check size={15} /></span>}{imageUsage(url).length > 0 && <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#935941]">{imageUsage(url).join("、")}</span>}</span><span className="block truncate bg-[#f9f7f4] px-2 py-2 text-[11px] text-[#675e53]">{fileName(url)}</span></button>)}</div>
          {visible.length === 0 && <p className="py-10 text-center text-sm text-[#8a7f75]">無圖片</p>}
        </section>
      </div>

      <aside className="self-start rounded-2xl border border-[#e5d8c8] bg-white p-5 shadow-2xs xl:sticky xl:top-6">
        <h2 className="text-base font-bold text-[#302b26]">確認更換</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">{([["目前", currentImage], ["新圖", selected]] as const).map(([label, url]) => <div key={label}><p className="mb-2 text-xs font-semibold text-[#935941]">{label}</p><div className="relative aspect-square overflow-hidden rounded-xl bg-[#e9e3d9]">{url ? <Image src={url} alt={label} fill sizes="160px" className="object-cover" /> : <span className="grid size-full place-items-center text-xs text-[#8a7f75]">未選圖</span>}</div><p className="mt-1 truncate text-[10px] text-[#8a7f75]">{url ? fileName(url) : ""}</p></div>)}</div>
        <button type="button" disabled={busy || !selected || selected === currentImage} onClick={() => void apply()} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#935941] px-4 text-sm font-semibold text-white hover:bg-[#7a4733] disabled:cursor-not-allowed disabled:opacity-45"><ImagePlus size={17} />{busy ? "更換中…" : selected === currentImage ? "無變更" : `更換${currentLocation.name}`}</button>
        <Link href={currentLocation.href} target="_blank" className="mt-3 flex min-h-9 items-center justify-center text-xs font-semibold text-[#935941] underline">前往頁面</Link>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-[#b8ceb9] bg-[#eef5ef] p-3 text-sm text-[#35553a]">{notice}</p>}
      </aside>
    </div>
  </div>;
}
