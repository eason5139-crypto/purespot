"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bookmark,
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
  Stamp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

const HONOR_TITLES = [
  "全里最會裝餓代表",
  "半夜三點跑酷金牌",
  "聽見開罐頭瞬移大師",
  "沙發馬鈴薯榮譽里長",
  "挑嘴界米其林主審",
];

const HONOR_STAMPS = [
  "乾飯第一名",
  "摸摸頭免費",
  "肉球爆米花香",
  "肚肚給摸認證",
];

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

  // 街坊摸摸頭計數與毛孩里民證產生器狀態
  const [patsMap, setPatsMap] = useState<Record<string, number>>({});
  const [cardPetName, setCardPetName] = useState(activePet.name);
  const [cardTitle, setCardTitle] = useState(HONOR_TITLES[0]!);
  const [cardStamp, setCardStamp] = useState(HONOR_STAMPS[0]!);

  useEffect(() => {
    setCardPetName(activePet.name);
  }, [activePet.name]);

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

  function handleCopyIdCard() {
    const text = `🪪【台灣毛孩榮譽里民證】\n姓名：${cardPetName}\n榮譽頭銜：${cardTitle}\n里長核章：💮 ${cardStamp}\n—— 來自 PURESPOT 街坊毛孩牆`;
    navigator.clipboard.writeText(text);
    toast.success("已複製里民證宣言！可直接貼到 IG 限動或 Threads 炫耀 🐾");
  }

  function handleUseIdCardInDiary() {
    setTitle(`【里民報到】${cardPetName} 獲頒「${cardTitle}」！`);
    setBody(
      `今天幫 ${cardPetName} 領了台灣毛孩榮譽里民證，里長認證「${cardStamp}」！分享一下我們家最近的開飯日常～`,
    );
    writePost();
  }

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#faf6f0] pb-24 text-[#302b26]"
    >
      {/* 溫暖街坊首屏 */}
      <section className="overflow-hidden border-b border-[#e3d5c4] bg-[#f4ebe0]">
        <div className="page-shell grid min-h-[460px] items-center gap-10 py-12 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf2] border border-[#dfd0be] px-3.5 py-1 text-xs font-bold tracking-wider text-[#935941]">
              <PawPrint size={13} />
              PURESPOT · 台灣街坊毛孩牆
            </p>
            <h1 className="editorial-title mt-5 text-[clamp(3rem,6.5vw,5.6rem)] font-bold leading-[1.08] tracking-[-.05em] text-[#302b26]">
              每一種陪伴，
              <br />
              <span className="text-[#935941]">都有街坊回聲。</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#5f5246]">
              分享一餐好飯、一次巷口散步、或牠今天又做了什麼傻事。幫主子印一張榮譽里民證，找到步調相近的台灣毛孩家庭！
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                onClick={writePost}
                className="gap-2 bg-[#935941] px-6 text-white hover:bg-[#7d4934]"
              >
                <Plus size={17} />
                貼一張拍立得日記
              </Button>
              <a
                href="#id-card-studio"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-[#935941] bg-[#fffaf2] px-5 text-sm font-bold text-[#935941] shadow-[0_2px_0_#935941] hover:bg-[#fdf2e4]"
              >
                <Award size={17} />
                印製毛孩榮譽里民證
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
              <span className="absolute bottom-5 left-5 rounded-full border border-white/60 bg-[#fffaf2]/95 px-4 py-2 text-xs font-bold text-[#935941] shadow-sm">
                📸 每個台灣毛孩家庭的小故事，都值得被聽見
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell pt-12">
        {/* 原創互動：台灣毛孩榮譽里民證印製所 */}
        <section
          id="id-card-studio"
          className="mb-12 scroll-mt-28 rounded-[2rem] border-2 border-[#dccab5] bg-[linear-gradient(135deg,#fffcf7_0%,#f4eadc_100%)] p-6 shadow-[0_18px_45px_-28px_rgba(110,72,48,0.22),0_5px_0_#dfd0be] sm:p-8"
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4e6752]/12 px-3 py-1 text-xs font-bold text-[#4e6752]">
                <Award size={14} />
                社群爆紅互動・30 秒免費領證
              </span>
              <h2 className="editorial-title mt-3 text-2xl font-bold text-[#302b26] sm:text-4xl">
                印一張「台灣毛孩榮譽里民證」🪪
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#695d52]">
                挑一個最符合牠個性的搞笑頭銜與里長印章，可以一鍵複製發 IG 限動，或直接帶入街坊日記跟鄰居打招呼！
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#5e5044]">
                    1. 里民大名（可自由修改）
                    <input
                      type="text"
                      maxLength={20}
                      value={cardPetName}
                      onChange={(e) => setCardPetName(e.target.value || activePet.name)}
                      className="input !mt-1.5 bg-white font-bold"
                    />
                  </label>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold text-[#5e5044]">
                    2. 選擇榮譽頭銜
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {HONOR_TITLES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCardTitle(t)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                          cardTitle === t
                            ? "bg-[#935941] text-white shadow-2xs scale-105"
                            : "border border-[#dfd0be] bg-white text-[#6a5b4e] hover:border-[#935941]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold text-[#5e5044]">
                    3. 蓋上里長認證紅章
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {HONOR_STAMPS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCardStamp(st)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                          cardStamp === st
                            ? "bg-[#4e6752] text-white shadow-2xs scale-105"
                            : "border border-[#dfd0be] bg-white text-[#6a5b4e] hover:border-[#4e6752]"
                        }`}
                      >
                        💮 {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 即時里民證預覽卡 */}
            <div className="flex flex-col items-center">
              <motion.div
                key={`${cardPetName}-${cardTitle}-${cardStamp}`}
                initial={{ scale: 0.96, rotate: -1 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ rotate: 1, y: -4 }}
                className="relative w-full max-w-md overflow-hidden rounded-[1.6rem] border-2 border-[#b89b7a] bg-[linear-gradient(145deg,#fffdf8_0%,#f7ebd9_100%)] p-6 shadow-[0_18px_40px_-20px_rgba(95,60,35,0.35),0_4px_0_#c7ad90]"
              >
                <div className="flex items-center justify-between border-b-2 border-[#d4be9f] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#935941] text-white">
                      <PawPrint size={14} />
                    </span>
                    <span className="font-serif text-sm font-bold tracking-widest text-[#302b26]">
                      台灣毛孩幸福里・榮譽里民證
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#8c735b]">
                    NO. TW-{activePet.type.slice(0, 2)}889
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-5">
                  <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-[#d6c2a8] bg-[#fffaf2] text-center shadow-inner">
                    <span className="text-3xl">
                      {activePet.type === "CAT"
                        ? "🐱"
                        : activePet.type === "DOG"
                          ? "🐶"
                          : activePet.type === "HAMSTER"
                            ? "🐹"
                            : "🐰"}
                    </span>
                    <span className="mt-1 text-[10px] font-bold text-[#7c6652]">
                      {petLabels[activePet.type]}里民
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-xs text-[#7d6c5c]">
                      里民姓名：
                      <strong className="ml-1 text-lg font-bold text-[#302b26]">
                        {cardPetName}
                      </strong>
                    </p>
                    <p className="text-xs text-[#7d6c5c]">
                      年度稱號：
                      <span className="ml-1 inline-block rounded-md bg-[#935941]/12 px-2 py-0.5 text-xs font-bold text-[#935941]">
                        {cardTitle}
                      </span>
                    </p>
                    <p className="text-xs text-[#7d6c5c]">
                      發證單位：PURESPOT 台灣街坊自治會
                    </p>
                  </div>
                </div>

                {/* 紅色印章效果 */}
                <motion.div
                  initial={{ scale: 1.5, opacity: 0, rotate: -25 }}
                  animate={{ scale: 1, opacity: 1, rotate: -14 }}
                  className=" absolute bottom-4 right-5 flex items-center gap-1 rounded-xl border-2 border-[#c84b31] bg-[#fff5f2]/90 px-3 py-1 text-xs font-black tracking-wider text-[#c84b31] shadow-2xs"
                >
                  <Stamp size={14} />
                  {cardStamp}
                </motion.div>
              </motion.div>

              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyIdCard}
                  className="btn-tactile inline-flex items-center gap-1.5 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white"
                >
                  <Copy size={14} />
                  複製里民證宣言（發 IG／Threads）
                </button>
                <button
                  type="button"
                  onClick={handleUseIdCardInDiary}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#d6c4b0] bg-white px-4 py-2.5 text-xs font-bold text-[#5a4a3c] hover:bg-[#f4ece1]"
                >
                  <Plus size={14} />
                  用這張證發一篇日記
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 同頻毛孩交流圈 */}
        <div id="circle" className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <section className="rounded-[1.6rem] border border-[#e3d5c4] bg-white p-6 shadow-xs sm:p-7">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#935941]">
              <Sparkles size={16} /> SAME RHYTHM · 街坊認親
            </p>
            <h2 className="editorial-title mt-2 text-2xl font-bold sm:text-3xl">
              同頻毛孩交流圈
            </h2>
            <p className="mt-1.5 text-sm leading-7 text-[#695d52]">
              選擇已儲存的毛孩，馬上看看相同物種與年齡階段的台灣毛孩家庭都在吃什麼、玩什麼。
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
                    ? "先在毛孩檔案儲存一位家人，就能找到同頻日常。"
                    : "登入會員後，就能用毛孩檔案找到同頻日常。"}
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
            <h3 className="mt-4 text-xl font-bold">溫暖交流，安心分享。</h3>
            <p className="mt-2.5 text-xs leading-6 text-[#e4efe5]">
              新日記會先經過管理員溫柔把關。公開時只顯示毛孩名稱與生活故事，不公開個人信箱。
            </p>
            <p className="mt-4 border-t border-white/20 pt-3 text-xs text-[#cfe0d1]">
              喜歡別人家毛孩？點一下卡片上的「👋 摸摸頭」幫牠加人氣！
            </p>
          </aside>
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">📸 拍立得日常手札</p>
            <h2 className="editorial-title mt-1.5 text-3xl font-bold sm:text-4xl">
              街坊毛孩動態牆
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

                    {/* 街坊摸摸頭微互動按鈕 */}
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
                      className="flex min-h-9 items-center gap-1 rounded-full bg-[#fdf3e7] px-3 text-xs font-bold text-[#935941] hover:bg-[#f8e5cf]"
                    >
                      👋 摸摸頭 {localPats}
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
                              成為第一個跟 {post.petName} 打招呼的鄰居！
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
                              placeholder="寫下溫暖留言..."
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
              這裡還沒有日記，貼上第一張毛孩拍立得吧！
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
                  <p className="text-xs font-bold tracking-wider text-[#935941]">
                    📸 貼上街坊拍立得牆
                  </p>
                  <h2 id="diary-title" className="editorial-title mt-1 text-3xl font-bold">
                    寫一篇毛孩日記
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6e5f52]">
                    送出後由管理員審核，公開後街坊鄰居就能看見並給牠摸摸頭！
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
                      placeholder="今天，牠做了什麼可愛的小事？"
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
                      placeholder="一餐飯、一次散步，或只屬於你們的小片刻…"
                      className="input mt-2 min-h-32 resize-y"
                    />
                  </label>
                  <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[#c8b29b] bg-[#faf4eb] p-4 text-sm font-semibold text-[#935941] hover:bg-[#f3e8d9]">
                    <ImagePlus size={22} />
                    <span>
                      {photo
                        ? photo.name
                        : "加一張照片（PNG、JPG、WebP，4 MB 以內）"}
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
