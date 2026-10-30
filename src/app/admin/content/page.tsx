"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { defaultSiteContent, type SiteContent } from "@/lib/siteContent";

type ContentKey = keyof SiteContent;
type Field = { key: ContentKey; label: string; kind?: "long" | "image"; help?: string };
type Section = { id: string; title: string; description: string; fields: Field[] };

const sections: Section[] = [
  {
    id: "hero",
    title: "首頁主視覺",
    description: "訪客進站時最先看到的標題、引言、按鈕與形象照片。",
    fields: [
      { key: "heroEyebrow", label: "眉標" },
      { key: "heroTitle", label: "主標題前段" },
      { key: "heroAccent", label: "主標題強調文字" },
      { key: "heroDescription", label: "品牌介紹", kind: "long" },
      { key: "heroImage", label: "首頁主照片", kind: "image" },
      { key: "heroImageAlt", label: "照片替代文字", help: "描述畫面內容，供讀屏工具與搜尋使用。" },
      { key: "heroPrimaryLabel", label: "主要按鈕文字" },
      { key: "heroSecondaryLabel", label: "試算按鈕文字" },
    ],
  },
  {
    id: "benefits",
    title: "品牌特色",
    description: "首頁四張特色卡片的標題與說明，可依實際商品與服務調整。",
    fields: [
      { key: "benefitsTitle", label: "區塊標題" },
      { key: "benefitsDescription", label: "區塊說明", kind: "long" },
      { key: "benefit1Title", label: "特色 1 標題" },
      { key: "benefit1Text", label: "特色 1 說明", kind: "long" },
      { key: "benefit2Title", label: "特色 2 標題" },
      { key: "benefit2Text", label: "特色 2 說明", kind: "long" },
      { key: "benefit3Title", label: "特色 3 標題" },
      { key: "benefit3Text", label: "特色 3 說明", kind: "long" },
      { key: "benefit4Title", label: "特色 4 標題" },
      { key: "benefit4Text", label: "特色 4 說明", kind: "long" },
    ],
  },
  {
    id: "stories",
    title: "家庭與社群",
    description: "說明家庭共管與毛孩社群的內容及社群形象照片。",
    fields: [
      { key: "familyTitle", label: "家庭區標題" },
      { key: "familyDescription", label: "家庭區說明", kind: "long" },
      { key: "communityTitle", label: "社群區標題" },
      { key: "communityDescription", label: "社群區說明", kind: "long" },
      { key: "communityImage", label: "社群形象照片", kind: "image" },
      { key: "finalTitle", label: "首頁結尾標題" },
      { key: "finalDescription", label: "首頁結尾說明", kind: "long" },
    ],
  },
  {
    id: "pages",
    title: "其他頁面文案",
    description: "商城引言與 7C 透明度頁面的標題與說明。",
    fields: [
      { key: "shopBadge", label: "商城區塊標籤" },
      { key: "shopTitleAccent", label: "商城標題強調文字" },
      { key: "shopDescription", label: "商城說明", kind: "long" },
      { key: "shopImage", label: "商城選物專區形象照", kind: "image" },
      { key: "transparencyTitle", label: "透明資訊頁標題" },
      { key: "transparencyDescription", label: "透明資訊頁說明", kind: "long" },
    ],
  },
  {
    id: "global",
    title: "全站訊息",
    description: "頂端公告與每一頁都會看到的頁尾文字。",
    fields: [
      { key: "announcement", label: "頂端公告" },
      { key: "footerTagline", label: "頁尾品牌語" },
      { key: "footerNotice", label: "頁尾重要說明", kind: "long" },
    ],
  },
];

export default function AdminContentPage() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [active, setActive] = useState(sections[0]!.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/content", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { content?: SiteContent; error?: string };
        if (!response.ok || !data.content) throw new Error(data.error || "無法載入內容");
        setContent(data.content);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "無法載入內容"))
      .finally(() => setLoading(false));
  }, []);

  const section = sections.find((item) => item.id === active) ?? sections[0]!;

  function change(key: ContentKey, value: string) {
    setContent((previous) => ({ ...previous, [key]: value }));
    setMessage("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "儲存失敗");
      setMessage("已儲存。重新開啟官網即可看到更新。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow text-[#5B93C5]">內容管理</span>
          <h1 className="mt-2 text-3xl font-semibold text-[#302b26]">網站內容編輯</h1>
          <p className="mt-2 text-sm text-[#675e53]">按頁面區塊修改文字與照片，儲存後立即用官網預覽。</p>
        </div>
        <Link href="/" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d9cfc3] bg-white px-4 text-sm font-semibold text-[#5B93C5] hover:bg-[#ede5da]">
          <ExternalLink size={16} /> 開啟官網
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="內容分類" className="flex gap-2 overflow-x-auto rounded-2xl border border-[#e8ded3] bg-white p-3 shadow-sm lg:block lg:space-y-1">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              aria-current={active === item.id ? "page" : undefined}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-medium transition-all lg:w-full ${
                active === item.id
                  ? "bg-[#5B93C5] text-white shadow-sm font-semibold"
                  : "text-[#675e53] hover:bg-[#f5ede3] hover:text-[#302b26]"
              }`}
            >
              {item.title}
            </button>
          ))}
        </nav>

        <form onSubmit={save} className="rounded-2xl border border-[#e8ded3] bg-white p-5 sm:p-8 shadow-sm">
          <div className="border-b border-[#e8ded3] pb-5">
            <h2 className="text-xl font-semibold text-[#302b26]">{section.title}</h2>
            <p className="mt-1 text-sm text-[#8a7f75]">{section.description}</p>
          </div>
          {loading ? (
            <p className="py-12 text-[#8a7f75]">載入網站內容中…</p>
          ) : (
            <div className="grid gap-6 py-7">
              {section.fields.map((field) => (
                <div key={field.key}>
                  {field.kind === "image" ? (
                    <MediaUploadField label={field.label} value={content[field.key]} onChange={(url) => change(field.key, url)} />
                  ) : (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#302b26]">{field.label}</span>
                      {field.kind === "long" ? (
                        <textarea
                          required
                          rows={3}
                          value={content[field.key]}
                          onChange={(event) => change(field.key, event.target.value)}
                          className="input min-h-24"
                        />
                      ) : (
                        <input
                          required
                          value={content[field.key]}
                          onChange={(event) => change(field.key, event.target.value)}
                          className="input"
                        />
                      )}
                    </label>
                  )}
                  {field.help && <p className="mt-2 text-xs text-[#8a7f75]">{field.help}</p>}
                </div>
              ))}
            </div>
          )}
          {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-[#e8f1f8] border border-[#78a6c9]/30 p-3 text-sm text-[#315F86] font-medium"><CheckCircle2 size={16} />{message}</p>}
          <div className="flex justify-end border-t border-[#e8ded3] pt-5">
            <Button type="submit" disabled={loading || saving} className="gap-2"><Save size={16} />{saving ? "儲存中…" : "儲存網站內容"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
