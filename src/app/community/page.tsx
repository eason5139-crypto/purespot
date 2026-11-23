"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bookmark,
  Camera,
  Check,
  Copy,
  Heart,
  ImagePlus,
  MessageCircle,
  PawPrint,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SpeciesMedallion,
  WaxSealStamp,
} from "@/components/ui/CraftEmblems";
import { DigitalCertificateStudio } from "@/components/community/DigitalCertificateStudio";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { usePetContextStore, useActivePet } from "@/store/usePetContextStore";
import { triggerPawBurst } from "@/lib/flyToCart";
import type { CommunityPostView } from "@/lib/community";
import { dateLabel } from "@/lib/utils";

type CloudPet = {
  id: string;
  name: string;
  type: "CAT" | "DOG" | "HAMSTER" | "RABBIT";
};
type View = "all" | "circle" | "mine" | "saved";
const kinds = [
  ["ALL", "所有毛孩"],
  ["CAT", "貓咪"],
  ["DOG", "狗狗"],
  ["HAMSTER", "倉鼠"],
  ["RABBIT", "兔兔"],
] as const;
const petLabels: Record<string, string> = {
  CAT: "貓咪",
  DOG: "狗狗",
  HAMSTER: "倉鼠",
  RABBIT: "兔兔",
};
const stages: Record<string, string> = {
  JUNIOR: "幼年",
  ADULT: "成齡",
  SENIOR: "熟齡",
};

export default function CommunityPage() {
  const user = useAuthStore((state) => state.user);
  const openAuth = useUiStore((state) => state.setAuthOpen);
  const savedPets = usePetContextStore((state) => state.allPets);
  const activePet = useActivePet();

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

  // 街坊擊掌致意計數
  const [patsMap, setPatsMap] = useState<Record<string, number>>({});

  const load = useCallback(
    async (next?: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (view === "mine") params.set("mine", "1");
        if (view === "saved") params.set("saved", "1");
        if (view === "circle" && circlePet) params.set("matchPet", circlePet);
        if (view === "all" && kind !== "ALL") params.set("type", kind);
        if (query.trim()) params.set("search", query.trim());
        if (next) params.set("cursor", next);
        const response = await fetch(`/api/community/posts?${params}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          posts?: CommunityPostView[];
          nextCursor?: string | null;
          error?: string;
        };
        if (!response.ok || !result.posts)
          throw new Error(result.error || "日記無法載入");
        setPosts((previous) =>
          next ? [...previous, ...result.posts!] : result.posts!,
        );
        setCursor(result.nextCursor ?? null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "日記無法載入");
      } finally {
        setLoading(false);
      }
    },
    [view, circlePet, kind, query],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setCirclePet("");
      return;
    }
    let active = true;
    void fetch("/api/pets", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { pets?: CloudPet[] }) => {
        if (!active) return;
        const saved = data.pets ?? [];
        setPets(saved);
        setPostPet((previous) => previous || saved[0]?.id || "");
      })
      .catch(() => {
        if (active) setPets([]);
      });
    return () => {
      active = false;
    };
  }, [user, savedPets]);

  function needMember() {
    if (user) return true;
    openAuth(true);
    return false;
  }
  function writePost() {
    if (needMember()) setComposer(true);
  }
  function changeView(next: View) {
    if (next !== "all" && !needMember()) return;
    if (next === "circle" && !circlePet && pets[0]) setCirclePet(pets[0].id);
    setView(next);
  }

  async function action(id: string, payload: Record<string, string>) {
    if (!needMember()) return;
    setBusy(id);
    try {
      const response = await fetch(`/api/community/posts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(data.error || "操作失敗");
      if (payload.action === "comment")
        setDrafts((previous) => ({ ...previous, [id]: "" }));
      if (payload.action === "report") {
        setReporting(null);
        toast.success(data.message || "已送出檢舉");
      }
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "操作失敗");
    } finally {
      setBusy("");
    }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!needMember()) return;
    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (photo) {
        const form = new FormData();
        form.set("file", photo);
        const response = await fetch("/api/community/media", {
          method: "POST",
          body: form,
        });
        const data = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !data.url)
          throw new Error(data.error || "照片上傳失敗");
        imageUrl = data.url;
      }
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: postPet, title, body, imageUrl }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(data.error || "日記送出失敗");
      setComposer(false);
      setTitle("");
      setBody("");
      setPhoto(null);
      setView("mine");
      toast.success(data.message || "日記已送出");
      if (view === "mine") await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "日記送出失敗");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/community/posts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("刪除失敗");
      setConfirmDelete(null);
      await load();
      toast.success("日記已刪除");
    } catch {
      toast.error("日記刪除失敗");
    } finally {
      setBusy("");
    }
  }

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#faf6f0] pb-24 text-[#302b26]"
    >
      {/* 街坊生活誌首屏 */}
      <section className="overflow-hidden border-b border-[#e3d5c4] bg-[#f4ebe0]">
        <div className="page-shell grid min-h-[460px] items-center gap-10 py-12 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd0be] bg-[#fffaf2] px-3.5 py-1 text-xs font-bold tracking-wider text-[#935941]">
              <PawPrint size={13} />
              PURESPOT · 毛孩生活圈
            </p>
            <h1 className="editorial-title mt-5 text-[clamp(3rem,6.5vw,5.4rem)] font-bold leading-[1.08] tracking-[-.05em] text-[#302b26]">
              毛孩生活圈
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#5f5246]">
              分享一餐飯、一次散步或牠今天的小進步，認識也喜歡毛孩的朋友。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                onClick={writePost}
                className="gap-2 bg-[#935941] px-6 text-white hover:bg-[#7d4934]"
              >
                <Plus size={17} />
                分享毛孩日常
              </Button>
              <a
                href="#id-card-studio"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-[#935941] bg-[#fffaf2] px-5 text-sm font-bold text-[#935941] shadow-[0_2px_0_#935941] hover:bg-[#fdf2e4]"
              >
                <Award size={17} />
                製作里民手形銘牌
              </a>
              <Link
                href="/community/connect"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d8c7b4] bg-white px-5 text-sm font-bold text-[#5e4d3f] hover:bg-[#f4ece1]"
              >
                <Send size={16} />
                IG／LINE 分享排版器
              </Link>
            </div>
          </div>

          <div className="polaroid-card relative min-h-[330px] rotate-[1deg] overflow-hidden rounded-[2rem] p-4 lg:min-h-[420px]">
            <div className="relative h-full min-h-[300px] overflow-hidden rounded-2xl bg-[#e3d5c5]">
              <Image
                src="/images/editorial/small-friends-v2.png"
                alt="倉鼠與兔兔在家中相伴"
                fill
                priority
                sizes="(max-width:1024px) 100vw,52vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2a2019]/65 via-transparent to-transparent" />
              <span className="craft-tag absolute bottom-5 left-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-[#935941] shadow-sm">
                <Camera size={13} />
                每個台灣毛孩家庭的生活片刻，都值得細細留存
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 原創工藝體驗：台灣街坊毛孩・數位銅版雕花里民伴食認證書 */}
      <DigitalCertificateStudio
        activePet={activePet}
        onUseInDiary={({ petName, title: honor, stamp, serialNo }) => {
          setTitle(
            `【數位里民認證】${petName} 獲頒「${honor}」伴食認證書 (${serialNo})`,
          );
          setBody(
            `今天為 ${petName} 核發了台灣街坊毛孩數位里民伴食認證書（證書字號：${serialNo}，封蠟雙印鑑：${stamp}）。記錄一下我們家最近的飲食與生活日常。`,
          );
          writePost();
        }}
      />

      <div className="page-shell pt-12">

        {/* 同頻毛孩交流圈 */}
        <div id="circle" className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <section className="rounded-[1.6rem] border border-[#e3d5c4] bg-white p-6 shadow-xs sm:p-7">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#935941]">
              <Sparkles size={16} /> SAME RHYTHM · 同頻家庭交流
            </p>
            <h2 className="editorial-title mt-2 text-2xl font-bold sm:text-3xl">
              同頻毛孩交流圈
            </h2>
            <p className="mt-1.5 text-sm leading-7 text-[#695d52]">
              選擇已儲存的毛孩檔案，參閱相同物種與生命階段的台灣家庭都在選用哪些食糧與日常器物。
            </p>
            {pets.length ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <select
                  aria-label="選擇毛孩交流圈"
                  value={circlePet}
                  onChange={(event) => {
                    setCirclePet(event.target.value);
                    setView("circle");
                  }}
                  className="input !mt-0 min-w-52 flex-1 sm:flex-none"
                >
                  <option value="">選擇毛孩</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} · {petLabels[pet.type]}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={() => changeView("circle")}>
                  進入同頻交流圈
                </Button>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <p className="text-sm text-[#695d52]">
                  {user
                    ? "請先於毛孩檔案儲存一位成員，即可媒合同頻日常。"
                    : "登入會員後，即可依毛孩檔案查看同頻交流日常。"}
                </p>
                {user ? (
                  <Button asChild variant="secondary">
                    <Link href="/account">前往毛孩檔案</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => openAuth(true)}>
                    登入會員
                  </Button>
                )}
              </div>
            )}
          </section>

          <aside className="rounded-[1.6rem] bg-[#4e6752] p-6 text-white shadow-md">
            <ShieldCheck size={24} className="text-[#dce8dd]" />
            <h3 className="mt-4 text-xl font-bold">真誠交流，安心留存。</h3>
            <p className="mt-2.5 text-xs leading-6 text-[#e4efe5]">
              公開發表之日記會經過審核確認。版面僅呈現毛孩姓名與生活故事，完整保護飼主聯繫隱私。
            </p>
            <p className="mt-4 border-t border-white/20 pt-3 text-xs text-[#cfe0d1]">
              喜歡這份日常分享？可點擊卡片下方「擊掌致意」給予鼓勵。
            </p>
          </aside>
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">POLAROID JOURNAL · 街坊相片手札</p>
            <h2 className="editorial-title mt-1.5 text-3xl font-bold sm:text-4xl">
              街坊毛孩生活牆
            </h2>
          </div>
          <Button onClick={writePost} className="gap-2">
            <Plus size={16} />
            新增拍立得日記
          </Button>
        </div>

        <div
          className="mt-6 flex flex-wrap gap-2 border-y border-[#e3d5c4] py-4"
          role="group"
          aria-label="日記檢視方式"
        >
          {(["all", "circle", "mine", "saved"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => changeView(item)}
              className={`min-h-10 rounded-full px-4 text-xs font-bold transition-all ${
                view === item
                  ? "bg-[#935941] text-white shadow-[0_2px_0_#6e3f2c]"
                  : "bg-white text-[#66584c] hover:bg-[#f4ece1]"
              }`}
            >
              {item === "all"
                ? "全部街坊日常"
                : item === "circle"
                  ? "同頻交流圈"
                  : item === "mine"
                    ? "我的日記"
                    : "已收藏"}
            </button>
          ))}
        </div>

        {view === "all" && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="毛孩分類"
          >
            {kinds.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={kind === id}
                onClick={() => setKind(id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                  kind === id
                    ? "border-[#935941] bg-[#fdf3e7] text-[#935941]"
                    : "border-[#dfd0be] bg-white text-[#7a7067] hover:border-[#935941]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <label className="mt-5 flex max-w-sm items-center gap-2 rounded-xl border border-[#dfd0be] bg-white px-4 text-[#7c6d5f]">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋日記、毛孩名字"
            aria-label="搜尋日記"
            className="min-h-11 w-full bg-transparent text-sm text-[#302b26] outline-none"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-8 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const localPats = patsMap[post.id] ?? 12;
            return (
              <motion.article
                key={post.id}
                whileHover={{ y: -5 }}
                className="polaroid-card relative overflow-hidden rounded-[1.8rem] p-3.5"
              >
                <div className="relative aspect-[1.28] overflow-hidden rounded-2xl bg-[#efe5d8]">
                  {post.imageUrl ? (
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      sizes="(max-width:768px) 100vw,33vw"
                      className="object-cover transition-transform duration-700 hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#ffffff,transparent_40%),linear-gradient(140deg,#f5ebe0,#e8d8c5)] p-8">
                      <p className="editorial-title text-center text-2xl font-bold text-[#935941]">
                        {post.title}
                      </p>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-[#fffcf7]/95 px-3 py-1 text-xs font-bold text-[#935941] shadow-2xs">
                    {petLabels[post.petType]} · {stages[post.lifeStage]}
                  </span>
                  {post.status !== "PUBLISHED" && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#935941] px-3 py-1 text-xs font-bold text-white">
                      {post.status === "PENDING" ? "待審核" : "已隱藏"}
                    </span>
                  )}
                </div>

                <div className="p-3 pt-4">
                  <p className="text-xs font-medium text-[#8a7a6b]">
                    {post.petName} 的家人 · {dateLabel(post.createdAt)}
                  </p>
                  <h3 className="editorial-title mt-2 text-xl font-bold leading-snug text-[#302b26]">
                    {post.title}
                  </h3>
                  <p className="mt-2.5 whitespace-pre-wrap text-sm leading-7 text-[#5c5046]">
                    {post.body}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-[#ece0d1] pt-3.5">
                    <button
                      type="button"
                      disabled={busy === post.id || post.status !== "PUBLISHED"}
                      aria-label={post.liked ? "取消喜歡" : "喜歡這篇日記"}
                      aria-pressed={post.liked}
                      onClick={(e) => {
                        triggerPawBurst(e.currentTarget);
                        void action(post.id, { action: "like" });
                      }}
                      className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold disabled:opacity-40 ${
                        post.liked
                          ? "bg-[#fce8e6] text-[#c85a48]"
                          : "bg-[#faf5ed] text-[#6d5e50] hover:bg-[#f2e8dc]"
                      }`}
                    >
                      <Heart
                        size={15}
                        fill={post.liked ? "currentColor" : "none"}
                      />
                      {post.likesCount}
                    </button>

                    {/* 街坊擊掌致意按鈕 */}
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        triggerPawBurst(e.currentTarget);
                        setPatsMap((prev) => ({
                          ...prev,
                          [post.id]: (prev[post.id] ?? 12) + 1,
                        }));
                      }}
                      className="flex min-h-9 items-center gap-1.5 rounded-full bg-[#fdf3e7] px-3 text-xs font-bold text-[#935941] hover:bg-[#f8e5cf]"
                    >
                      <PawPrint size={13} />
                      <span>擊掌致意 {localPats}</span>
                    </motion.button>

                    <button
                      type="button"
                      disabled={post.status !== "PUBLISHED"}
                      aria-expanded={commentsOpen === post.id}
                      onClick={() =>
                        setCommentsOpen((current) =>
                          current === post.id ? null : post.id,
                        )
                      }
                      className="flex min-h-9 items-center gap-1.5 rounded-full bg-[#faf5ed] px-3 text-xs font-bold text-[#6d5e50] hover:bg-[#f2e8dc] disabled:opacity-40"
                    >
                      <MessageCircle size={15} />
                      {post.comments.length}
                    </button>

                    <button
                      type="button"
                      disabled={busy === post.id || post.status !== "PUBLISHED"}
                      aria-label={post.saved ? "取消收藏" : "收藏這篇日記"}
                      aria-pressed={post.saved}
                      onClick={() => void action(post.id, { action: "bookmark" })}
                      className={`ml-auto flex size-9 items-center justify-center rounded-full disabled:opacity-40 ${
                        post.saved
                          ? "bg-[#fdf3e7] text-[#935941]"
                          : "text-[#6d5e50] hover:bg-[#f2e8dc]"
                      }`}
                    >
                      <Bookmark
                        size={16}
                        fill={post.saved ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  <AnimatePresence>
                    {commentsOpen === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-2.5 border-t border-[#ece0d1] pt-3.5">
                          {post.comments.length ? (
                            post.comments.map((comment) => (
                              <p
                                key={comment.id}
                                className="rounded-xl bg-[#faf5ed] px-3 py-2 text-xs text-[#4e433a]"
                              >
                                <span className="font-bold text-[#935941]">
                                  {comment.author}：
                                </span>
                                {comment.body}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-[#8a7f75]">
                              成為第一位向 {post.petName} 留言的鄰居
                            </p>
                          )}
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void action(post.id, {
                                action: "comment",
                                body: drafts[post.id] ?? "",
                              });
                            }}
                            className="flex gap-2"
                          >
                            <input
                              value={drafts[post.id] ?? ""}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [post.id]: event.target.value,
                                }))
                              }
                              maxLength={300}
                              placeholder="寫下友善留言…"
                              aria-label={`留言給${post.title}`}
                              className="min-w-0 flex-1 rounded-xl border border-[#dfd0be] bg-white px-3 py-2 text-xs outline-none focus:border-[#935941]"
                            />
                            <button
                              type="submit"
                              disabled={!drafts[post.id]?.trim() || busy === post.id}
                              aria-label="送出留言"
                              className="rounded-xl bg-[#935941] px-3 text-white hover:bg-[#7d4934] disabled:opacity-50"
                            >
                              <Send size={14} />
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {post.mine ? (
                    <div className="mt-3 flex justify-end">
                      {confirmDelete === post.id ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span>確定刪除？</span>
                          <button
                            type="button"
                            onClick={() => void remove(post.id)}
                            disabled={busy === post.id}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white"
                          >
                            刪除
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1.5 text-[#687780]"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(post.id)}
                          className="flex items-center gap-1 text-xs text-[#8a7f75] hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                          刪除我的日記
                        </button>
                      )}
                    </div>
                  ) : (
                    post.status === "PUBLISHED" && (
                      <div className="mt-3 flex justify-end">
                        {reporting === post.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label="檢舉原因"
                              value={reportReason}
                              onChange={(event) =>
                                setReportReason(event.target.value)
                              }
                              className="rounded-lg border border-[#dfd0be] px-2 py-1 text-xs"
                            >
                              <option value="SPAM">廣告或洗版</option>
                              <option value="HARASSMENT">不友善內容</option>
                              <option value="MISINFORMATION">資訊不實</option>
                              <option value="OTHER">其他</option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                void action(post.id, {
                                  action: "report",
                                  reason: reportReason,
                                })
                              }
                              className="rounded-lg bg-[#935941] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              送出
                            </button>
                            <button
                              type="button"
                              onClick={() => setReporting(null)}
                              className="text-xs text-[#8a7f75]"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (needMember()) setReporting(post.id);
                            }}
                            className="text-xs text-[#8a7f75] hover:text-[#935941]"
                          >
                            檢舉內容
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>

        {loading && (
          <p role="status" className="py-8 text-center text-sm text-[#8a7f75]">
            正在載入街坊日記…
          </p>
        )}
        {!loading && posts.length === 0 && !error && (
          <div className="mt-8 rounded-2xl border border-[#e3d5c4] bg-white px-6 py-16 text-center">
            <Sparkles size={28} className="mx-auto text-[#935941]" />
            <p className="mt-3 text-sm text-[#695d52]">
              尚未有符合篩選的日記，歡迎發表第一則生活紀錄。
            </p>
            <Button onClick={writePost} variant="secondary" className="mt-5">
              寫一篇日記
            </Button>
          </div>
        )}
        {cursor && (
          <div className="mt-8 text-center">
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => void load(cursor)}
            >
              查看更多街坊日記
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {composer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#241c16]/65 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setComposer(false);
            }}
          >
            <motion.form
              onSubmit={publish}
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="diary-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.8rem] border-2 border-[#dfd0be] bg-[#fffcf7] p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#935941]">
                    <Camera size={13} />
                    JOURNAL UPLOAD · 發表街坊拍立得日記
                  </p>
                  <h2
                    id="diary-title"
                    className="editorial-title mt-1 text-3xl font-bold"
                  >
                    寫一篇毛孩生活日記
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6e5f52]">
                    送出後由管理員審核確認，公開後鄰居就能看見並擊掌致意。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposer(false)}
                  aria-label="關閉"
                  className="rounded-full p-2 text-[#6e5f52] hover:bg-[#f4ece1]"
                >
                  <X size={20} />
                </button>
              </div>
              {pets.length === 0 ? (
                <div className="mt-7 rounded-xl bg-[#faf4eb] p-5 text-sm text-[#5c5046]">
                  請先在毛孩檔案新增並儲存毛孩，再來分享日常。
                  <Link
                    href="/account"
                    className="ml-2 font-bold text-[#935941] underline"
                  >
                    前往帳戶
                  </Link>
                </div>
              ) : (
                <>
                  <label className="mt-6 block text-sm font-bold text-[#302b26]">
                    這篇日記關於誰？
                    <select
                      required
                      value={postPet}
                      onChange={(event) => setPostPet(event.target.value)}
                      className="input mt-2"
                    >
                      <option value="">選擇毛孩</option>
                      {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} · {petLabels[pet.type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-4 block text-sm font-bold text-[#302b26]">
                    標題
                    <input
                      required
                      minLength={4}
                      maxLength={80}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="今天發生了什麼值得紀錄的日常？"
                      className="input mt-2"
                    />
                  </label>
                  <label className="mt-4 block text-sm font-bold text-[#302b26]">
                    故事內容
                    <textarea
                      required
                      minLength={10}
                      maxLength={1200}
                      rows={5}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="一餐飯、一次散步，或只屬於你們的靜謐片刻…"
                      className="input mt-2 min-h-32 resize-y"
                    />
                  </label>
                  <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[#c8b29b] bg-[#faf4eb] p-4 text-sm font-semibold text-[#935941] hover:bg-[#f3e8d9]">
                    <ImagePlus size={22} />
                    <span>
                      {photo
                        ? photo.name
                        : "附加相片（PNG、JPG、WebP，4 MB 以內）"}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) =>
                        setPhoto(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setComposer(false)}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      disabled={sending || !postPet}
                      className="gap-2"
                    >
                      {sending ? (
                        "送出中…"
                      ) : (
                        <>
                          <Check size={16} />
                          送出日記
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
