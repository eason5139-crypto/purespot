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
      <p className="mb-2 text-sm font-medium text-[#302b26]">{label}</p>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e8ded3] bg-[#fbf8f4] p-3">
        <div className="relative h-24 w-32 overflow-hidden rounded-xl bg-[#ebe5da] border border-[#e8ded3]">
          {value && <Image src={value} alt={label} fill sizes="128px" className="object-contain p-1" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#935941] px-4 text-sm font-semibold text-white hover:bg-[#794632] shadow-sm disabled:opacity-50 transition-colors"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {busy ? "處理中" : "上傳圖片"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleLibrary()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d9cfc3] bg-white px-4 text-sm font-semibold text-[#4e443a] hover:bg-[#ede5da] disabled:opacity-50 transition-colors"
            >
              <Images size={16} />從媒體庫選擇
            </button>
          </div>
          <p className="mt-2 truncate text-xs text-[#8a7f75]">{value || "尚未選擇圖片"}</p>
          <p className="text-xs text-[#8a7f75]">PNG、JPG 或 WebP，最多 4 MB</p>
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
        <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[#e8ded3] bg-white p-3 shadow-md sm:grid-cols-4">
          {library.map((url) => (
            <button key={url} type="button" onClick={() => { onChange(url); setLibraryOpen(false); }} className="overflow-hidden rounded-lg border border-[#e8ded3] text-left hover:border-[#935941] transition-colors" aria-label={`選擇圖片 ${url}`}>
              <span className="relative block aspect-square bg-[#ebe5da]"><Image src={url} alt="" fill sizes="120px" className="object-contain p-1" /></span>
              <span className="block truncate p-1 text-[10px] text-[#675e53]">{url.split("/").at(-1)}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}
    </div>
  );
}
