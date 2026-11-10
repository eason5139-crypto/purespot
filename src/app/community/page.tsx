"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, Heart, ImagePlus, MessageCircle, Plus, Search, Send, ShieldCheck, Sparkles, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { usePetContextStore } from "@/store/usePetContextStore";
import type { CommunityPostView } from "@/lib/community";
import { dateLabel } from "@/lib/utils";

type CloudPet = { id: string; name: string; type: "CAT" | "DOG" | "HAMSTER" | "RABBIT" };
type View = "all" | "circle" | "mine" | "saved";
const kinds = [
  ["ALL", "所有毛孩"], ["CAT", "貓咪"], ["DOG", "狗狗"], ["HAMSTER", "倉鼠"], ["RABBIT", "兔兔"],
] as const;
const petLabels: Record<string, string> = { CAT: "貓咪", DOG: "狗狗", HAMSTER: "倉鼠", RABBIT: "兔兔" };
const stages: Record<string, string> = { JUNIOR: "幼年", ADULT: "成齡", SENIOR: "熟齡" };

export default function CommunityPage() {
  const user = useAuthStore((state) => state.user);
  const openAuth = useUiStore((state) => state.setAuthOpen);
  const savedPets = usePetContextStore((state) => state.allPets);
  const [posts, setPosts] = useState<CommunityPostView[]>([]);
  const [pets, setPets] = useState<CloudPet[]>([]);
  const [view, setView] = useState<View>("all");
  const [kind, setKind] = useState("ALL");
  const [circlePet, setCirclePet] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState(false);
  const [postPet, setPostPet] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState("");
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");

  const load = useCallback(async (next?: string) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (view === "mine") params.set("mine", "1");
      if (view === "saved") params.set("saved", "1");
      if (view === "circle" && circlePet) params.set("matchPet", circlePet);
      if (view === "all" && kind !== "ALL") params.set("type", kind);
      if (query.trim()) params.set("search", query.trim());
      if (next) params.set("cursor", next);
      const response = await fetch(`/api/community/posts?${params}`, { cache: "no-store" });
      const result = await response.json() as { posts?: CommunityPostView[]; nextCursor?: string | null; error?: string };
      if (!response.ok || !result.posts) throw new Error(result.error || "日記無法載入");
      setPosts((previous) => next ? [...previous, ...result.posts!] : result.posts!);
      setCursor(result.nextCursor ?? null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "日記無法載入"); }
    finally { setLoading(false); }
  }, [view, circlePet, kind, query]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), query ? 250 : 0); return () => window.clearTimeout(timer); }, [load, query]);
  useEffect(() => {
    if (!user) { setPets([]); setCirclePet(""); return; }
    let active = true;
    void fetch("/api/pets", { cache: "no-store" }).then((response) => response.json()).then((data: { pets?: CloudPet[] }) => {
      if (!active) return;
      const saved = data.pets ?? [];
      setPets(saved);
      setPostPet((previous) => previous || saved[0]?.id || "");
    }).catch(() => { if (active) setPets([]); });
    return () => { active = false; };
  }, [user, savedPets]);

  function needMember() { if (user) return true; openAuth(true); return false; }
  function writePost() { if (needMember()) setComposer(true); }
  function changeView(next: View) {
    if (next !== "all" && !needMember()) return;
    if (next === "circle" && !circlePet && pets[0]) setCirclePet(pets[0].id);
    setView(next);
  }

  async function action(id: string, payload: Record<string, string>) {
    if (!needMember()) return;
    setBusy(id);
    try {
      const response = await fetch(`/api/community/posts/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "操作失敗");
      if (payload.action === "comment") setDrafts((previous) => ({ ...previous, [id]: "" }));
      if (payload.action === "report") { setReporting(null); toast.success(data.message || "已送出檢舉"); }
      await load();
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "操作失敗"); }
    finally { setBusy(""); }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!needMember()) return;
    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (photo) {
        const form = new FormData(); form.set("file", photo);
        const response = await fetch("/api/community/media", { method: "POST", body: form });
        const data = await response.json() as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error || "照片上傳失敗");
        imageUrl = data.url;
      }
      const response = await fetch("/api/community/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId: postPet, title, body, imageUrl }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "日記送出失敗");
      setComposer(false); setTitle(""); setBody(""); setPhoto(null); setView("mine");
      toast.success(data.message || "日記已送出");
      if (view === "mine") await load();
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "日記送出失敗"); }
    finally { setSending(false); }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/community/posts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("刪除失敗");
      setConfirmDelete(null); await load(); toast.success("日記已刪除");
    } catch { toast.error("日記刪除失敗"); }
    finally { setBusy(""); }
  }

  return <main id="main-content" className="min-h-screen bg-[#f8f5ef] pb-24 text-[#302b26]">
    <section className="overflow-hidden bg-[#e8f1f8]"><div className="page-shell grid min-h-[490px] items-center gap-10 py-12 lg:grid-cols-[.95fr_1.05fr]">
      <div><p className="text-xs font-bold tracking-[.22em] text-[#376F9F]">PURESPOT · LIFE WITH PETS</p><h1 className="editorial-title mt-5 text-[clamp(3.5rem,7vw,6.5rem)] font-medium leading-[1.08] tracking-[-.075em]">每一種陪伴，<br /><span className="text-[#5B93C5]">都有回聲。</span></h1><p className="mt-7 max-w-lg text-base leading-8 text-[#596d7a]">分享一餐飯、一次散步、牠剛學會的小事。找到步調相近的毛孩家庭，讓照顧不再只是自己的功課。</p><div className="mt-8 flex flex-wrap gap-3"><Button onClick={writePost} className="gap-2 bg-[#315F86] px-6 text-white hover:bg-[#244b6b]"><Plus size={17} />寫下今天的日常</Button><a href="#circle" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#a9c6da] bg-white/75 px-5 text-sm font-semibold text-[#315F86] hover:bg-white"><Users size={17} />找同頻毛孩</a><Link href="/community/connect" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#a9c6da] bg-white/75 px-5 text-sm font-semibold text-[#315F86] hover:bg-white"><Send size={17}/>試試 IG／LINE 分享</Link></div></div>
      <div className="relative min-h-[330px] overflow-hidden rounded-[2.2rem] bg-[#d9e5e9] shadow-[0_34px_80px_-42px_rgba(40,80,112,.48)] lg:min-h-[450px]"><Image src="/images/editorial/small-friends-v2.png" alt="倉鼠與兔兔在家中相伴" fill priority sizes="(max-width:1024px) 100vw,52vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#17384b]/60 via-transparent to-transparent" /><span className="absolute bottom-6 left-6 rounded-full border border-white/60 bg-white/85 px-5 py-2.5 text-xs font-semibold text-[#315F86] backdrop-blur">每個小故事，都值得被聽見</span></div>
    </div></section>

    <div id="circle" className="page-shell pt-12"><div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="rounded-[1.6rem] border border-[#dce7ef] bg-white p-6 shadow-sm sm:p-7"><p className="flex items-center gap-2 text-xs font-bold tracking-[.2em] text-[#315F86]"><Sparkles size={17} /> SAME RHYTHM</p><h2 className="editorial-title mt-3 text-3xl">同頻毛孩交流圈</h2><p className="mt-2 text-sm leading-7 text-[#687780]">選擇已儲存的毛孩，看見相同種類與年齡階段的生活日記。</p>{pets.length ? <div className="mt-5 flex flex-wrap gap-3"><select aria-label="選擇毛孩交流圈" value={circlePet} onChange={(event) => { setCirclePet(event.target.value); setView("circle"); }} className="input min-w-52 flex-1 sm:flex-none"><option value="">選擇毛孩</option>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · {petLabels[pet.type]}</option>)}</select><Button variant="secondary" onClick={() => changeView("circle")}>進入交流圈</Button></div> : <div className="mt-5 flex flex-wrap items-center gap-3"><p className="text-sm text-[#687780]">{user ? "先在毛孩檔案儲存一位家人，就能找到同頻日常。" : "登入會員後，就能用毛孩檔案找到同頻日常。"}</p>{user ? <Button asChild variant="secondary"><Link href="/account">前往毛孩檔案</Link></Button> : <Button variant="secondary" onClick={() => openAuth(true)}>登入會員</Button>}</div>}</section>
      <aside className="rounded-[1.6rem] bg-[#315F86] p-6 text-white shadow-[0_20px_45px_-28px_rgba(31,67,97,.7)]"><ShieldCheck size={24} className="text-[#b8d8ed]" /><h3 className="mt-5 text-xl font-semibold">舒服交流，慢慢分享。</h3><p className="mt-3 text-sm leading-7 text-[#e0edf5]">新日記會先經過審核。公開時只顯示毛孩名稱與生活故事，不顯示會員電子郵件。</p><p className="mt-5 border-t border-white/20 pt-4 text-xs text-[#c4dae9]">遇到不合適內容，可在貼文內檢舉。</p></aside>
    </div>

    <div className="mt-12 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.2em] text-[#5B93C5]">THE JOURNAL</p><h2 className="editorial-title mt-2 text-3xl sm:text-4xl">毛孩社群動態</h2><p className="mt-2 text-sm text-[#687780]">來自社群的生活片段</p></div><Button onClick={writePost} variant="secondary" className="gap-2"><Plus size={16} />新增日記</Button></div>
    <div className="mt-7 flex flex-wrap gap-2 border-y border-[#dce7ef] py-4" role="group" aria-label="日記檢視方式">{(["all", "circle", "mine", "saved"] as View[]).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => changeView(item)} className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${view === item ? "bg-[#315F86] text-white" : "bg-white text-[#62727e] hover:bg-[#e8f1f8]"}`}>{item === "all" ? "全部日常" : item === "circle" ? "同頻交流圈" : item === "mine" ? "我的日記" : "已收藏"}</button>)}</div>
    {view === "all" && <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="毛孩分類">{kinds.map(([id, label]) => <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${kind === id ? "border-[#5B93C5] bg-[#e8f1f8] text-[#315F86]" : "border-[#e2ddd6] bg-white text-[#7a7067] hover:border-[#5B93C5]"}`}>{label}</button>)}</div>}
    <label className="mt-5 flex max-w-sm items-center gap-2 rounded-xl border border-[#d3e0ea] bg-white px-4 text-[#71808d]"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋日記、毛孩名字" aria-label="搜尋日記" className="min-h-11 w-full bg-transparent text-sm text-[#302b26] outline-none" /></label>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="mt-7 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <article key={post.id} className="overflow-hidden rounded-[1.6rem] border border-[#dce7ef] bg-white shadow-[0_20px_55px_-40px_rgba(40,79,109,.35)]">
      <div className="relative aspect-[1.32] overflow-hidden bg-[#e8f1f8]">{post.imageUrl ? <Image src={post.imageUrl} alt={post.title} fill sizes="(max-width:768px) 100vw,33vw" className="object-cover transition-transform duration-700 hover:scale-[1.04]" /> : <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#ffffff,transparent_40%),linear-gradient(140deg,#dbeaf5,#efe7dc)] p-8"><p className="editorial-title text-center text-3xl text-[#315F86]">{post.title}</p></div>}<span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#315F86] backdrop-blur">{petLabels[post.petType]} · {stages[post.lifeStage]}</span>{post.status !== "PUBLISHED" && <span className="absolute right-4 top-4 rounded-full bg-[#315F86] px-3 py-1.5 text-xs font-semibold text-white">{post.status === "PENDING" ? "待審核" : "已隱藏"}</span>}</div>
      <div className="p-5 sm:p-6"><p className="text-xs text-[#79858d]">{post.petName}的家人 · {dateLabel(post.createdAt)}</p><h3 className="editorial-title mt-3 text-2xl leading-snug">{post.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#53616b]">{post.body}</p><div className="mt-6 flex items-center gap-1 border-t border-[#e2eaf0] pt-4">
        <button type="button" disabled={busy === post.id || post.status !== "PUBLISHED"} aria-label={post.liked ? "取消喜歡" : "喜歡這篇日記"} aria-pressed={post.liked} onClick={() => void action(post.id, { action: "like" })} className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm disabled:opacity-40 ${post.liked ? "bg-[#e8f1f8] text-[#315F86]" : "text-[#687780] hover:bg-[#f2f6fa]"}`}><Heart size={17} fill={post.liked ? "currentColor" : "none"} />{post.likesCount}</button>
        <button type="button" disabled={post.status !== "PUBLISHED"} aria-expanded={commentsOpen === post.id} onClick={() => setCommentsOpen((current) => current === post.id ? null : post.id)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-[#687780] hover:bg-[#f2f6fa] disabled:opacity-40"><MessageCircle size={17} />{post.comments.length}</button>
        <button type="button" disabled={busy === post.id || post.status !== "PUBLISHED"} aria-label={post.saved ? "取消收藏" : "收藏這篇日記"} aria-pressed={post.saved} onClick={() => void action(post.id, { action: "bookmark" })} className={`ml-auto flex size-10 items-center justify-center rounded-full disabled:opacity-40 ${post.saved ? "bg-[#e8f1f8] text-[#315F86]" : "text-[#687780] hover:bg-[#f2f6fa]"}`}><Bookmark size={18} fill={post.saved ? "currentColor" : "none"} /></button>
      </div>
      <AnimatePresence>{commentsOpen === post.id && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="mt-4 space-y-3 border-t border-[#e2eaf0] pt-4">{post.comments.length ? post.comments.map((comment) => <p key={comment.id} className="rounded-xl bg-[#f4f8fb] px-3 py-2 text-sm text-[#4e5b64]"><span className="font-semibold text-[#315F86]">{comment.author}：</span>{comment.body}</p>) : <p className="text-xs text-[#8a7f75]">成為第一個留言的人。</p>}<form onSubmit={(event) => { event.preventDefault(); void action(post.id, { action: "comment", body: drafts[post.id] ?? "" }); }} className="flex gap-2"><input value={drafts[post.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={300} placeholder="寫下你的想法" aria-label={`留言給${post.title}`} className="min-w-0 flex-1 rounded-xl border border-[#d3e0ea] px-3 py-2 text-sm outline-none focus:border-[#5B93C5]" /><button type="submit" disabled={!drafts[post.id]?.trim() || busy === post.id} aria-label="送出留言" className="rounded-xl bg-[#5B93C5] px-3 text-white hover:bg-[#376F9F] disabled:opacity-50"><Send size={16} /></button></form></div></motion.div>}</AnimatePresence>
      {post.mine ? <div className="mt-4 flex justify-end">{confirmDelete === post.id ? <div className="flex items-center gap-2 text-xs"><span>確定刪除？</span><button type="button" onClick={() => void remove(post.id)} disabled={busy === post.id} className="rounded-lg bg-rose-600 px-3 py-2 font-semibold text-white">刪除</button><button type="button" onClick={() => setConfirmDelete(null)} className="px-2 py-2 text-[#687780]">取消</button></div> : <button type="button" onClick={() => setConfirmDelete(post.id)} className="flex items-center gap-1 text-xs text-[#8a7f75] hover:text-rose-600"><Trash2 size={14} />刪除我的日記</button>}</div> : post.status === "PUBLISHED" && <div className="mt-4 flex justify-end">{reporting === post.id ? <div className="flex flex-wrap items-center gap-2"><select aria-label="檢舉原因" value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="rounded-lg border border-[#d3e0ea] px-2 py-1.5 text-xs"><option value="SPAM">廣告或洗版</option><option value="HARASSMENT">不友善內容</option><option value="MISINFORMATION">資訊不實</option><option value="OTHER">其他</option></select><button type="button" onClick={() => void action(post.id, { action: "report", reason: reportReason })} className="rounded-lg bg-[#315F86] px-3 py-2 text-xs font-semibold text-white">送出</button><button type="button" onClick={() => setReporting(null)} className="text-xs text-[#8a7f75]">取消</button></div> : <button type="button" onClick={() => { if (needMember()) setReporting(post.id); }} className="text-xs text-[#8a7f75] hover:text-[#315F86]">檢舉內容</button>}</div>}
      </div>
    </article>)}</div>
    {loading && <p role="status" className="py-8 text-center text-sm text-[#8a7f75]">載入日記中…</p>}
    {!loading && posts.length === 0 && !error && <div className="mt-8 rounded-2xl border border-[#dce7ef] bg-white px-6 py-16 text-center"><Sparkles size={28} className="mx-auto text-[#5B93C5]" /><p className="mt-3 text-sm text-[#687780]">這裡還沒有日記，寫下第一段毛孩日常吧。</p><Button onClick={writePost} variant="secondary" className="mt-5">寫一篇日記</Button></div>}
    {cursor && <div className="mt-8 text-center"><Button variant="secondary" disabled={loading} onClick={() => void load(cursor)}>查看更多日記</Button></div>}
    </div>

    <AnimatePresence>{composer && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#182c3b]/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposer(false); }}><motion.form onSubmit={publish} initial={{ y: 24, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="diary-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.8rem] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-[#5B93C5]">A STORY TO SHARE</p><h2 id="diary-title" className="editorial-title mt-2 text-3xl">寫一篇毛孩日記</h2><p className="mt-2 text-sm text-[#697780]">送出後由管理員審核，公開後同好就能看見。</p></div><button type="button" onClick={() => setComposer(false)} aria-label="關閉" className="rounded-full p-2 text-[#697780] hover:bg-[#e8f1f8]"><X size={20} /></button></div>
      {pets.length === 0 ? <div className="mt-7 rounded-xl bg-[#f4f8fb] p-5 text-sm text-[#53616b]">請先在毛孩檔案新增並儲存毛孩，再來分享日常。<Link href="/account" className="ml-2 font-semibold text-[#315F86] underline">前往帳戶</Link></div> : <><label className="mt-6 block text-sm font-medium text-[#302b26]">這篇日記關於誰？<select required value={postPet} onChange={(event) => setPostPet(event.target.value)} className="input mt-2"><option value="">選擇毛孩</option>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · {petLabels[pet.type]}</option>)}</select></label><label className="mt-4 block text-sm font-medium text-[#302b26]">標題<input required minLength={4} maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="今天，牠做了什麼有趣的小事？" className="input mt-2" /></label><label className="mt-4 block text-sm font-medium text-[#302b26]">故事<textarea required minLength={10} maxLength={1200} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="一餐飯、一次散步，或只屬於你們的小片刻…" className="input mt-2 min-h-32 resize-y" /></label><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#9fbfd6] bg-[#f4f9fc] p-4 text-sm text-[#315F86] hover:bg-[#eaf3fa]"><ImagePlus size={22} /><span>{photo ? photo.name : "加一張照片（PNG、JPG、WebP，4 MB 以內）"}</span><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></label><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setComposer(false)}>取消</Button><Button type="submit" disabled={sending || !postPet} className="gap-2 bg-[#315F86] text-white hover:bg-[#244b6b]">{sending ? "送出中…" : <><Check size={16} />送出日記</>}</Button></div></>}
    </motion.form></motion.div>}</AnimatePresence>
  </main>;
}
