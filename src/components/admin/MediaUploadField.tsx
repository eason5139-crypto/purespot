"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Images, LoaderCircle } from "lucide-react";

export function MediaUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<string[]>([]);

  async function toggleLibrary() {
    if (libraryOpen) { setLibraryOpen(false); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/media", { cache: "no-store" });
      const result = (await response.json()) as { images?: string[]; error?: string };
      if (!response.ok || !result.images) throw new Error(result.error || "無法讀取媒體庫");
      setLibrary(result.images);
      setLibraryOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法讀取媒體庫");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "圖片上傳失敗");
      onChange(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "圖片上傳失敗");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#f4e5d9]">{label}</p>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e9a06d]/20 bg-white/5 p-3">
        <div className="relative h-24 w-32 overflow-hidden rounded-xl bg-[#1b120e]">
          {value && <Image src={value} alt={label} fill sizes="128px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f4a261] px-4 text-sm font-semibold text-[#2b170f] disabled:opacity-50"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {busy ? "處理中" : "上傳圖片"}
            </button>
            <button type="button" disabled={busy} onClick={() => void toggleLibrary()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e9a06d]/25 px-4 text-sm text-[#f3d3bd] disabled:opacity-50">
              <Images size={16} />從媒體庫選擇
            </button>
          </div>
          <p className="mt-2 truncate text-xs text-[#b99e8d]">{value || "尚未選擇圖片"}</p>
          <p className="text-xs text-[#8d776b]">PNG、JPG 或 WebP，最多 4 MB</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {libraryOpen && (
        <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[#e9a06d]/20 bg-[#21140f] p-3 sm:grid-cols-4">
          {library.map((url) => (
            <button key={url} type="button" onClick={() => { onChange(url); setLibraryOpen(false); }} className="overflow-hidden rounded-lg border border-white/10 text-left hover:border-[#f4a261]" aria-label={`選擇圖片 ${url}`}>
              <span className="relative block aspect-square"><Image src={url} alt="" fill sizes="120px" className="object-cover" /></span>
              <span className="block truncate p-1 text-[10px] text-[#d0b5a5]">{url.split("/").at(-1)}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
