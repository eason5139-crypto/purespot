"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, EyeOff, Flag, Heart, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateLabel } from "@/lib/utils";

type Status = "PENDING" | "PUBLISHED" | "HIDDEN";
type AdminPost = {
  id: string; title: string; body: string; imageUrl: string | null;
  petName: string; petType: string; lifeStage: string; status: Status;
  createdAt: string; author: string; likesCount: number; reportsCount: number;
  reports: string[];
  comments: { id: string; body: string; status: "PUBLISHED" | "HIDDEN"; createdAt: string }[];
};
type Filter = "PENDING" | "REPORTED" | "PUBLISHED" | "HIDDEN" | "ALL";

const statusLabel: Record<Status, string> = { PENDING: "待審核", PUBLISHED: "已公開", HIDDEN: "已隱藏" };
const typeLabel: Record<string, string> = { CAT: "貓咪", DOG: "狗狗", HAMSTER: "倉鼠", RABBIT: "兔兔" };
const reasonLabel: Record<string, string> = { SPAM: "廣告洗版", HARASSMENT: "騷擾", MISINFORMATION: "資訊不實", OTHER: "其他" };

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/community", { cache: "no-store" });
      const result = await response.json() as { posts?: AdminPost[]; error?: string };
      if (!response.ok || !result.posts) throw new Error(result.error || "無法載入社群內容");
      setPosts(result.posts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法載入社群內容");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function update(target: "post" | "comment", id: string, status: Status | "PUBLISHED" | "HIDDEN") {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/community", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, id, status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "更新失敗");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "更新失敗"); }
    finally { setBusyId(""); }
  }

  const counts = useMemo(() => ({
    PENDING: posts.filter((post) => post.status === "PENDING").length,
    REPORTED: posts.filter((post) => post.reportsCount > 0 && post.status === "PUBLISHED").length,
    PUBLISHED: posts.filter((post) => post.status === "PUBLISHED").length,
    HIDDEN: posts.filter((post) => post.status === "HIDDEN").length,
    ALL: posts.length,
  }), [posts]);
  const filtered = posts.filter((post) => filter === "ALL" || (filter === "REPORTED" ? post.reportsCount > 0 && post.status === "PUBLISHED" : post.status === filter));

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><span className="eyebrow text-[#5B93C5]">COMMUNITY DESK</span><h1 className="mt-2 text-3xl font-semibold text-[#302b26]">社群內容管理</h1><p className="mt-2 text-sm leading-6 text-[#675e53]">審核新日記、處理檢舉與留言，讓交流保持友善。</p></div>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />重新整理</Button><Button asChild variant="secondary"><Link href="/community" target="_blank">查看社群</Link></Button></div>
    </div>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#bcd5e9] bg-[#eaf3fa] p-5"><p className="text-sm text-[#315F86]">待審核</p><p className="mt-2 font-mono text-3xl font-semibold text-[#253b4d]">{counts.PENDING}</p></div>
      <div className="rounded-2xl border border-[#f0ddbd] bg-[#fdf6ea] p-5"><p className="text-sm text-[#8a5a14]">待處理檢舉</p><p className="mt-2 font-mono text-3xl font-semibold text-[#563c22]">{counts.REPORTED}</p></div>
      <div className="rounded-2xl border border-[#d8e6d5] bg-[#f0f6ef] p-5"><p className="text-sm text-[#456c4b]">公開日記</p><p className="mt-2 font-mono text-3xl font-semibold text-[#2d4b32]">{counts.PUBLISHED}</p></div>
    </div>
    <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="社群內容篩選">
      {(["PENDING", "REPORTED", "PUBLISHED", "HIDDEN", "ALL"] as Filter[]).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${filter === value ? "border-[#315F86] bg-[#315F86] text-white" : "border-[#e8ded3] bg-white text-[#675e53] hover:border-[#5B93C5]"}`}>{value === "REPORTED" ? "遭檢舉" : value === "ALL" ? "全部" : statusLabel[value]} <span className="ml-1 opacity-70">{counts[value]}</span></button>)}
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="mt-6 space-y-4">
      {loading ? <p className="rounded-2xl border border-[#e8ded3] bg-white p-10 text-center text-[#8a7f75]">載入社群內容中…</p> : filtered.length === 0 ? <div className="rounded-2xl border border-[#e8ded3] bg-white px-6 py-14 text-center"><ShieldCheck size={32} className="mx-auto text-[#5B93C5]" /><p className="mt-3 text-[#675e53]">這個分類目前沒有內容</p></div> : filtered.map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm">
        <div className="grid gap-0 md:grid-cols-[180px_1fr]">
          {post.imageUrl && <div className="relative min-h-44 bg-[#f2eee8]"><Image src={post.imageUrl} alt={post.title} fill sizes="180px" className="object-cover" /></div>}
          <div className="p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-[#eaf3fa] px-3 py-1 font-semibold text-[#315F86]">{statusLabel[post.status]}</span><span className="text-[#8a7f75]">{typeLabel[post.petType]} · {post.petName} · {dateLabel(post.createdAt)}</span></div><h2 className="mt-3 text-xl font-semibold text-[#302b26]">{post.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#675e53]">{post.body}</p><p className="mt-3 text-xs text-[#8a7f75]">投稿者：{post.author} · <Heart size={12} className="inline" /> {post.likesCount} · <MessageCircle size={12} className="inline" /> {post.comments.length}</p>
            {post.reportsCount > 0 && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#fdf6ea] px-3 py-2 text-xs text-[#8a5a14]"><Flag size={14} />{post.reportsCount} 筆檢舉：{post.reports.map((reason) => reasonLabel[reason] ?? reason).join("、")}</p>}
            <div className="mt-5 flex flex-wrap gap-2">{post.status !== "PUBLISHED" && <Button size="sm" disabled={busyId === post.id} onClick={() => void update("post", post.id, "PUBLISHED")} className="gap-1.5"><Check size={15} />公開日記</Button>}{post.status !== "HIDDEN" && <Button size="sm" variant="secondary" disabled={busyId === post.id} onClick={() => void update("post", post.id, "HIDDEN")} className="gap-1.5"><EyeOff size={15} />隱藏日記</Button>}</div>
          </div>
        </div>
        {post.comments.length > 0 && <div className="border-t border-[#eee5db] bg-[#fcfaf7] p-5"><h3 className="text-sm font-semibold text-[#302b26]">近期留言</h3><div className="mt-3 space-y-2">{post.comments.map((comment) => <div key={comment.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#e8ded3] bg-white px-4 py-3"><div><p className="text-sm text-[#675e53]">{comment.body}</p><p className="mt-1 text-xs text-[#8a7f75]">{dateLabel(comment.createdAt)} · {comment.status === "HIDDEN" ? "已隱藏" : "已公開"}</p></div><Button size="sm" variant="secondary" disabled={busyId === comment.id} onClick={() => void update("comment", comment.id, comment.status === "HIDDEN" ? "PUBLISHED" : "HIDDEN")}>{comment.status === "HIDDEN" ? "恢復" : "隱藏"}</Button></div>)}</div></div>}
      </article>)}
    </div>
  </div>;
}
