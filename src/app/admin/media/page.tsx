"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy, Images } from "lucide-react";
import { MediaUploadField } from "@/components/admin/MediaUploadField";

export default function AdminMediaPage() {
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    void fetch("/api/admin/media", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { images?: string[]; error?: string };
        if (!response.ok) throw new Error(data.error || "無法載入媒體庫");
        setImages(data.images ?? []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "無法載入媒體庫"));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <span className="eyebrow">網站與商品</span>
      <h1 className="mt-2 text-3xl font-semibold text-[#fff7ec]">圖片媒體庫</h1>
      <p className="mt-2 text-sm text-[#bda595]">上傳品牌或商品照片；圖片可在網站內容與商品編輯器中選用。</p>
      <div className="mt-8 max-w-xl rounded-2xl border border-[#e9a06d]/20 bg-[#2a1b15] p-5">
        <MediaUploadField
          label="新增圖片"
          value=""
          onChange={(url) => setImages((previous) => [url, ...previous])}
        />
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-10 flex items-center gap-2">
        <Images size={20} className="text-[#f4a261]" />
        <h2 className="text-xl font-semibold text-[#fff7ec]">已上傳與內建圖片</h2>
        <span className="text-sm text-[#a78c7c]">({images.length})</span>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {images.map((url) => (
          <article key={url} className="overflow-hidden rounded-2xl border border-[#e9a06d]/15 bg-[#2a1b15]">
            <div className="relative aspect-[1.2]"><Image src={url} alt={url.split("/").at(-1) || "媒體圖片"} fill sizes="(max-width:640px) 100vw,25vw" className="object-cover" /></div>
            <div className="flex items-center gap-2 p-3">
              <code className="min-w-0 flex-1 truncate text-xs text-[#c7ae9d]">{url}</code>
              <button
                type="button"
                aria-label={`複製 ${url} 路徑`}
                onClick={async () => { await navigator.clipboard.writeText(url); setCopied(url); }}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#f4a261]"
              >
                {copied === url ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
