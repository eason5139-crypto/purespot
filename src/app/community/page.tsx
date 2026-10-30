"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, MessageCircle, Plus, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Kind = "ALL" | "CAT" | "DOG" | "SMALL";
type Entry = {
  id: string;
  kind: Exclude<Kind, "ALL">;
  title: string;
  text: string;
  image?: string;
  product?: { name: string; slug: string };
  author: string;
  date: string;
  mine?: boolean;
  liked?: boolean;
  saved?: boolean;
  comments: string[];
};

const STORAGE_KEY = "purespot-community-v2";
const tabs: { id: Kind; label: string }[] = [
  { id: "ALL", label: "所有日常" },
  { id: "CAT", label: "貓咪" },
  { id: "DOG", label: "狗狗" },
  { id: "SMALL", label: "小動物" },
];

const editorial: Entry[] = [
  {
    id: "editorial-cat",
    kind: "CAT",
    title: "慢一點的週末，也是很好的陪伴。",
    text: "陽光停在地板上的時候，牠會自己找個舒服的位置坐下。照顧毛孩，有時只是留出一段不趕時間的日常。",
    image: "/images/editorial/home-living-v2.png",
    product: { name: "看看貓咪的日常選物", slug: "salmon-cat" },
    author: "PURESPOT 編輯選輯",
    date: "生活提案",
    comments: [],
  },
  {
    id: "editorial-dog",
    kind: "DOG",
    title: "開飯前，先把家裡的步調放慢。",
    text: "好好挑一餐，也好好看牠吃完。從食材資訊、份量到喜歡的口感，每一步都可以更清楚。",
    image: "/images/editorial/shop-living-v2.png",
    product: { name: "看看狗狗的主食選擇", slug: "salmon-dog" },
    author: "PURESPOT 編輯選輯",
    date: "餐桌筆記",
    comments: [],
  },
  {
    id: "editorial-small",
    kind: "SMALL",
    title: "小小身影，也有自己的生活節奏。",
    text: "倉鼠喜歡探索，兔兔需要安心休息的角落。把環境準備好，再慢慢觀察牠們真正喜歡什麼。",
    image: "/images/editorial/small-friends-v2.png",
    author: "PURESPOT 編輯選輯",
    date: "小動物日常",
    comments: [],
  },
];

export default function CommunityPage() {
  const [entries, setEntries] = useState<Entry[]>(editorial);
  const [hydrated, setHydrated] = useState(false);
  const [kind, setKind] = useState<Kind>("ALL");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newKind, setNewKind] = useState<Exclude<Kind, "ALL">>("CAT");
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as Entry[];
        if (Array.isArray(data)) {
          const own = data.filter((entry) => entry.mine && typeof entry.title === "string");
          const seeded = editorial.map((entry) => {
            const previous = data.find((item) => item.id === entry.id);
            return { ...entry, liked: !!previous?.liked, saved: !!previous?.saved, comments: Array.isArray(previous?.comments) ? previous.comments : [] };
          });
          setEntries([...own, ...seeded]);
        }
      }
    } catch {
      // Damaged browser storage should not prevent the community page from opening.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* Storage can be unavailable in private browsing. */ }
  }, [entries, hydrated]);

  const filtered = useMemo(() => entries.filter((entry) => {
    const matchesKind = kind === "ALL" || entry.kind === kind;
    const matchesQuery = `${entry.title} ${entry.text} ${entry.author}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesKind && matchesQuery && (!savedOnly || entry.saved);
  }), [entries, kind, query, savedOnly]);

  function toggle(id: string, field: "liked" | "saved") {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, [field]: !entry[field] } : entry));
  }

  function addComment(id: string) {
    const message = commentDrafts[id]?.trim();
    if (!message) return;
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, comments: [...entry.comments, message] } : entry));
    setCommentDrafts((current) => ({ ...current, [id]: "" }));
    toast.success("留言已儲存在這個瀏覽器");
  }

  function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    const text = newText.trim();
    if (!title || !text) return;
    const entry: Entry = { id: crypto.randomUUID(), kind: newKind, title, text, author: "我的日記", date: new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" }).format(new Date()), mine: true, comments: [] };
    setEntries((current) => [entry, ...current]);
    setNewTitle("");
    setNewText("");
    setComposerOpen(false);
    setKind("ALL");
    setSavedOnly(false);
    toast.success("日記已儲存在這個瀏覽器");
  }

  return (
    <main id="main-content" className="min-h-screen bg-[#f8f5ef] pb-24 text-[#25282b]">
      <section className="overflow-hidden border-b border-[#dce7ef] bg-[#eaf3fa]">
        <div className="page-shell grid min-h-[420px] items-center gap-8 py-10 lg:grid-cols-[.9fr_1.1fr] lg:py-14">
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-[.22em] text-[#376F9F]">LIFE WITH PETS · PURESPOT</p>
            <h1 className="editorial-title mt-5 text-5xl leading-[1.12] sm:text-6xl">把陪伴，<br /><span className="text-[#5B93C5]">寫成日常。</span></h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#51616e]">一餐飯、一段散步，或牠今天探索的新角落。在這裡收藏照顧靈感，也記下你們自己的小事。</p>
            <Button onClick={() => setComposerOpen(true)} className="mt-7 gap-2 bg-[#5B93C5] text-white hover:bg-[#376F9F]"><Plus size={18} />寫一篇日記</Button>
            <p className="mt-4 text-xs text-[#697b89]">目前為體驗版；你的日記與互動只保存在這個瀏覽器。</p>
          </div>
          <div className="relative min-h-[310px] overflow-hidden rounded-[2rem] shadow-[0_30px_70px_-35px_rgba(37,67,93,.35)] sm:min-h-[390px]">
            <Image src="/images/editorial/small-friends-v2.png" alt="倉鼠與兔兔在溫暖居家空間的日常" fill priority sizes="(max-width:1024px) 100vw,55vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3c53]/45 to-transparent" />
            <span className="absolute bottom-5 left-5 rounded-full border border-white/60 bg-white/85 px-4 py-2 text-xs font-semibold text-[#315F86] backdrop-blur">每一種陪伴，都有自己的步調</span>
          </div>
        </div>
      </section>

      <div className="page-shell pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold tracking-[.2em] text-[#5B93C5]">THE JOURNAL</p><h2 className="editorial-title mt-2 text-3xl sm:text-4xl">日常靈感</h2><p className="mt-2 text-sm text-[#687780]">編輯選輯與你在此裝置寫下的日記</p></div>
          <Button variant="secondary" onClick={() => setComposerOpen(true)} className="gap-2"><Plus size={17} />新增日記</Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-y border-[#dce7ef] py-4">
          <div role="group" aria-label="日記分類" className="flex flex-wrap gap-2">
            {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setKind(tab.id)} aria-pressed={kind === tab.id} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${kind === tab.id ? "bg-[#315F86] text-white" : "bg-white text-[#52616d] hover:bg-[#e8f1f8]"}`}>{tab.label}</button>)}
          </div>
          <button type="button" onClick={() => setSavedOnly((value) => !value)} aria-pressed={savedOnly} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${savedOnly ? "bg-[#d8eaf7] text-[#315F86]" : "bg-white text-[#52616d]"}`}><Bookmark size={16} />已收藏</button>
          <label className="ml-auto flex min-h-10 min-w-[220px] items-center gap-2 rounded-full border border-[#d3e0ea] bg-white px-4 text-[#71808d]"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋日記" aria-label="搜尋日記" className="w-full bg-transparent text-sm text-[#25282b] outline-none" /></label>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => <article key={entry.id} className="overflow-hidden rounded-[1.65rem] border border-[#dce7ef] bg-white shadow-[0_20px_55px_-38px_rgba(40,79,109,.28)]">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#e8f1f8]">
              {entry.image ? <Image src={entry.image} alt={entry.title} fill sizes="(max-width:768px) 100vw,(max-width:1280px) 50vw,33vw" className="object-cover transition-transform duration-700 hover:scale-[1.04]" /> : <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,#ffffff,transparent_35%),linear-gradient(135deg,#dbeaf5,#f7f0e6)]"><span className="editorial-title px-8 text-center text-3xl text-[#315F86]">{entry.title}</span></div>}
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#315F86]">{tabs.find((tab) => tab.id === entry.kind)?.label}</span>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between gap-3 text-xs text-[#74828d]"><span>{entry.author} · {entry.date}</span>{entry.mine && <button type="button" aria-label={`刪除${entry.title}`} onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))} className="rounded-full p-2 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button>}</div>
              <h3 className="editorial-title mt-3 text-2xl leading-snug">{entry.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#53616b]">{entry.text}</p>
              {entry.product && <Link href={`/products/${entry.product.slug}`} className="mt-5 inline-flex items-center border-b border-[#8db7da] pb-1 text-sm font-semibold text-[#376F9F] hover:text-[#315F86]">{entry.product.name} →</Link>}
              <div className="mt-6 flex items-center gap-2 border-t border-[#e2eaf0] pt-4">
                <button type="button" aria-label={entry.liked ? "取消喜歡" : "喜歡這篇日記"} aria-pressed={!!entry.liked} onClick={() => toggle(entry.id, "liked")} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm ${entry.liked ? "bg-[#e8f1f8] text-[#315F86]" : "text-[#687780] hover:bg-[#f2f6fa]"}`}><Heart size={17} fill={entry.liked ? "currentColor" : "none"} />喜歡</button>
                <button type="button" aria-expanded={commentOpen === entry.id} onClick={() => setCommentOpen((current) => current === entry.id ? null : entry.id)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#687780] hover:bg-[#f2f6fa]"><MessageCircle size={17} />留言{entry.comments.length > 0 ? ` ${entry.comments.length}` : ""}</button>
                <button type="button" aria-label={entry.saved ? "取消收藏" : "收藏這篇日記"} aria-pressed={!!entry.saved} onClick={() => toggle(entry.id, "saved")} className={`ml-auto rounded-full p-2 ${entry.saved ? "bg-[#e8f1f8] text-[#315F86]" : "text-[#687780] hover:bg-[#f2f6fa]"}`}><Bookmark size={18} fill={entry.saved ? "currentColor" : "none"} /></button>
              </div>
              <AnimatePresence>{commentOpen === entry.id && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="mt-4 space-y-3 border-t border-[#e2eaf0] pt-4">{entry.comments.map((comment, index) => <p key={`${entry.id}-${index}`} className="rounded-xl bg-[#f4f8fb] px-3 py-2 text-sm text-[#4e5b64]">{comment}</p>)}<form onSubmit={(event) => { event.preventDefault(); addComment(entry.id); }} className="flex gap-2"><input value={commentDrafts[entry.id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [entry.id]: event.target.value }))} maxLength={300} placeholder="寫下你的想法" aria-label={`留言給${entry.title}`} className="min-w-0 flex-1 rounded-xl border border-[#d3e0ea] px-3 py-2 text-sm outline-none focus:border-[#5B93C5]" /><button type="submit" aria-label="送出留言" className="rounded-xl bg-[#5B93C5] px-3 text-white hover:bg-[#376F9F]"><Send size={16} /></button></form></div></motion.div>}</AnimatePresence>
            </div>
          </article>)}
        </div>

        {filtered.length === 0 && <div className="mt-8 rounded-2xl border border-[#dce7ef] bg-white px-6 py-16 text-center text-[#687780]">找不到符合條件的日記，試試其他分類或關鍵字。</div>}
        <p className="mt-8 text-xs leading-6 text-[#74828d]">編輯選輯為展示內容。喜歡、收藏、留言與個人日記只保存在你目前使用的瀏覽器，其他訪客不會看到。</p>
      </div>

      <AnimatePresence>{composerOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#182c3b]/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposerOpen(false); }}><motion.form onSubmit={publish} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="diary-title" className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><h2 id="diary-title" className="editorial-title text-3xl">寫一篇日記</h2><p className="mt-2 text-sm text-[#697780]">內容只儲存在這個瀏覽器。</p></div><button type="button" onClick={() => setComposerOpen(false)} aria-label="關閉" className="text-2xl text-[#697780]">×</button></div><label className="mt-6 block text-sm font-medium">毛孩類別<select value={newKind} onChange={(event) => setNewKind(event.target.value as Exclude<Kind, "ALL">)} className="mt-2 w-full rounded-xl border border-[#d3e0ea] bg-white px-3 py-3"><option value="CAT">貓咪</option><option value="DOG">狗狗</option><option value="SMALL">小動物</option></select></label><label className="mt-4 block text-sm font-medium">標題<input required maxLength={80} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="今天，牠做了什麼有趣的小事？" className="mt-2 w-full rounded-xl border border-[#d3e0ea] px-3 py-3 outline-none focus:border-[#5B93C5]" /></label><label className="mt-4 block text-sm font-medium">內容<textarea required maxLength={800} rows={5} value={newText} onChange={(event) => setNewText(event.target.value)} placeholder="記下你們的日常…" className="mt-2 w-full resize-y rounded-xl border border-[#d3e0ea] px-3 py-3 outline-none focus:border-[#5B93C5]" /></label><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setComposerOpen(false)}>取消</Button><Button type="submit" className="bg-[#5B93C5] text-white hover:bg-[#376F9F]">儲存日記</Button></div></motion.form></motion.div>}</AnimatePresence>
    </main>
  );
}
