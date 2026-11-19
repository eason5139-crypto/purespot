"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Clock,
  Crown,
  Headset,
  MessageSquarePlus,
  PawPrint,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useActivePet } from "@/store/usePetContextStore";
import { useAuthStore } from "@/store/useAuthStore";
import { petLabels } from "@/lib/types";
import {
  MEMBER_TIER_META,
  SUPPORT_CATEGORIES,
  type MemberTierCode,
  type SupportCategory,
  type SupportThread,
} from "@/lib/supportTypes";

const TOKEN_KEY = "purespot:support-client-token";

function getOrCreateClientToken(): string {
  if (typeof window === "undefined") return "server-token";
  const existing = window.localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const created = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  window.localStorage.setItem(TOKEN_KEY, created);
  return created;
}

const STATUS_META: Record<
  SupportThread["status"],
  { label: string; badge: string }
> = {
  OPEN: {
    label: "待專人處理",
    badge: "border-[#d8b892] bg-[#fdf5ea] text-[#935941]",
  },
  IN_PROGRESS: {
    label: "客服處理中",
    badge: "border-[#b8ceb9] bg-[#eef4ef] text-[#3d5c43]",
  },
  RESOLVED: {
    label: "已完成回覆",
    badge: "border-[#d4c9bc] bg-[#f4efe8] text-[#6d6054]",
  },
};

export function LiveSupportWidget() {
  const pet = useActivePet();
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "threads">("new");
  const [clientToken, setClientToken] = useState("");
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 新諮詢表單狀態（第一步必選問題分類）
  const [category, setCategory] = useState<SupportCategory>("NUTRITION");
  const [simulatedTier, setSimulatedTier] = useState<MemberTierCode>("GOLD");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [attachPet, setAttachPet] = useState(true);

  // 追問狀態
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    setClientToken(getOrCreateClientToken());
  }, []);

  useEffect(() => {
    if (user?.name && !buyerName) setBuyerName(user.name);
    if (user?.email && !buyerEmail) setBuyerEmail(user.email);
  }, [user, buyerName, buyerEmail]);

  const petSummaryText = `${pet.name}（${pet.breed || petLabels[pet.type]} · ${pet.weightKg}kg · ${Math.max(1, Math.round(pet.ageMonths / 12))}歲${pet.allergies.length > 0 ? ` · 避開過敏原：${pet.allergies.join("、")}` : " · 無已知過敏原"}）`;

  async function loadThreads(token = clientToken) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/support/chat?clientToken=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        profile?: {
          tier: MemberTierCode;
          name: string;
          email: string;
        };
        threads?: SupportThread[];
      };
      if (data.profile && user) {
        setSimulatedTier(data.profile.tier);
      }
      if (data.threads) {
        setThreads(data.threads);
        if (!activeThreadId && data.threads[0]) {
          setActiveThreadId(data.threads[0].id);
        }
      }
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && clientToken) {
      void loadThreads(clientToken);
    }
  }, [open, clientToken]);

  useEffect(() => {
    const onOpenSupport = (ev: Event) => {
      const detail = (ev as CustomEvent<{ category?: SupportCategory }>).detail;
      if (detail?.category) {
        setCategory(detail.category);
        setTab("new");
      }
      setOpen(true);
    };
    window.addEventListener("purespot:open-support", onOpenSupport);
    return () =>
      window.removeEventListener("purespot:open-support", onOpenSupport);
  }, []);

  const currentCategoryMeta =
    SUPPORT_CATEGORIES.find((c) => c.id === category) ?? SUPPORT_CATEGORIES[0]!;
  const currentTierMeta = MEMBER_TIER_META[simulatedTier];
  const activeThread =
    threads.find((t) => t.id === activeThreadId) ?? threads[0] ?? null;

  const unreadRepliesCount = threads.filter((t) => {
    const last = t.messages[t.messages.length - 1];
    return last?.sender === "ADMIN";
  }).length;

  async function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("請填寫問題主旨與諮詢內容");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          clientToken,
          buyerName: buyerName.trim() || undefined,
          buyerEmail: buyerEmail.trim() || undefined,
          simulatedTier,
          category,
          subject: subject.trim(),
          message: message.trim(),
          orderId: orderId.trim() || null,
          petSummary: attachPet ? petSummaryText : null,
        }),
      });
      const data = (await res.json()) as {
        thread?: SupportThread;
        error?: string;
      };
      if (!res.ok || !data.thread) {
        throw new Error(data.error || "送出諮詢失敗");
      }
      setThreads((prev) => [data.thread!, ...prev]);
      setActiveThreadId(data.thread.id);
      setSubject("");
      setMessage("");
      setTab("threads");
      toast.success(
        `已依「${currentTierMeta.label}」優先序送出「${currentCategoryMeta.shortLabel}」諮詢單`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          clientToken,
          threadId: activeThread.id,
          message: replyText.trim(),
        }),
      });
      const data = (await res.json()) as {
        thread?: SupportThread;
        error?: string;
      };
      if (!res.ok || !data.thread) {
        throw new Error(data.error || "傳送失敗");
      }
      setThreads((prev) =>
        prev.map((item) => (item.id === data.thread!.id ? data.thread! : item)),
      );
      setReplyText("");
      toast.success("訊息已傳送至公司客服後台");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "傳送失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* 右下角日台工藝懸浮客服按鈕 */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="開啟職人線上客服中心"
          className="group relative flex items-center gap-3 rounded-2xl border-2 border-[#935941] bg-[#fffdf8] px-4 py-3 text-left shadow-[0_12px_28px_-10px_rgba(95,55,30,0.35),0_3px_0_#6e3f2c] transition-colors hover:bg-[#fdf5ea]"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#935941] text-white shadow-inner">
            <Headset size={20} />
          </span>
          <div className="pr-1">
            <span className="block font-mono text-[10px] font-bold tracking-wider text-[#935941]">
              CRAFT CONCIERGE · 線上客服
            </span>
            <span className="block text-xs font-bold text-[#302b26]">
              分類諮詢・會員分級專線
            </span>
          </div>
          {unreadRepliesCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#4e6752] font-mono text-[10px] font-bold text-white shadow">
              {unreadRepliesCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* 線上客服互動視窗 */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-3 backdrop-blur-[2px] sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="support-widget-title"
              className="craft-letterpress flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-[#fffdf9] shadow-2xl"
            >
              {/* 頂部標題與會員分級狀態列 */}
              <div className="border-b border-[#e5d6c3] bg-[linear-gradient(135deg,#faf2e6_0%,#f2e3cf_100%)] px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#935941] px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white">
                        <Headset size={11} />
                        DIRECT CONCIERGE
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${currentTierMeta.badgeBg} ${currentTierMeta.badgeText} ${currentTierMeta.badgeBorder}`}
                      >
                        <Crown size={11} />
                        {currentTierMeta.label}
                      </span>
                    </div>
                    <h2
                      id="support-widget-title"
                      className="editorial-title mt-1.5 text-xl font-bold text-[#302b26]"
                    >
                      PURESPOT 職人線上客服與營養諮詢所
                    </h2>
                    <p className="mt-0.5 text-xs text-[#6b5d50]">
                      {currentTierMeta.slaText} · 訊息將自動分類並同步至公司後台
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="關閉客服視窗"
                    className="rounded-xl border border-[#dccab5] bg-white p-2 text-[#6b5d50] transition-colors hover:bg-[#f4ece1] hover:text-[#302b26]"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* 分頁切換 */}
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("new")}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      tab === "new"
                        ? "bg-[#935941] text-white shadow-xs"
                        : "border border-[#dccbb7] bg-white/80 text-[#5f5246] hover:bg-white"
                    }`}
                  >
                    <MessageSquarePlus size={14} />
                    1. 選擇分類發起諮詢
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("threads")}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      tab === "threads"
                        ? "bg-[#935941] text-white shadow-xs"
                        : "border border-[#dccbb7] bg-white/80 text-[#5f5246] hover:bg-white"
                    }`}
                  >
                    <Clock size={14} />
                    2. 對話紀錄與後台回覆 ({threads.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadThreads()}
                    aria-label="重新整理對話"
                    className="ml-auto rounded-xl border border-[#dccbb7] bg-white/80 p-2 text-[#6e5e50] hover:bg-white"
                  >
                    <RefreshCw
                      size={13}
                      className={loading ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              </div>

              {/* 內容捲動區 */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {tab === "new" ? (
                  <form onSubmit={handleSubmitNew} className="space-y-4">
                    {/* 會員分級佇列切換／顯示（支援展示不同等級在後台的分級排序） */}
                    <div className="rounded-2xl border border-[#e3d3c0] bg-[#faf4eb] p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5a4b3e]">
                          <Award size={14} className="text-[#935941]" />
                          會員等級分級通道（後台依等級優先派單）
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#935941]">
                          Priority P{currentTierMeta.priority}
                        </span>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {(
                          ["GOLD", "SILVER", "MEMBER", "GUEST"] as const
                        ).map((tierKey) => {
                          const m = MEMBER_TIER_META[tierKey];
                          const active = simulatedTier === tierKey;
                          return (
                            <button
                              key={tierKey}
                              type="button"
                              onClick={() => setSimulatedTier(tierKey)}
                              className={`rounded-xl border px-2.5 py-2 text-left transition-all ${
                                active
                                  ? "border-[#935941] bg-white font-bold text-[#935941] shadow-2xs ring-2 ring-[#935941]/15"
                                  : "border-[#e2d3c1] bg-[#fffcf8] text-[#6d5f52] hover:border-[#c8b299]"
                              }`}
                            >
                              <span className="block font-mono text-[10px] opacity-75">
                                P{m.priority} 等級
                              </span>
                              <span className="block truncate text-xs font-bold">
                                {m.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 第一步：必選五大問題分類 */}
                    <div>
                      <p className="text-xs font-bold text-[#302b26]">
                        第一步：請選擇您要詢問的問題類別（後台將自動分流至對應專員）
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {SUPPORT_CATEGORIES.map((cat) => {
                          const active = category === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCategory(cat.id)}
                              className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition-all ${
                                active
                                  ? "border-[#935941] bg-[#fdf5ea] shadow-[0_2px_0_#935941]"
                                  : "border-[#e6d8c8] bg-white hover:border-[#c9b39b]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold tracking-wider text-[#935941]">
                                  {cat.code}
                                </span>
                                {active && (
                                  <CheckCircle2
                                    size={14}
                                    className="text-[#935941]"
                                  />
                                )}
                              </div>
                              <p className="mt-1 text-xs font-bold text-[#302b26]">
                                {cat.label}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-4 text-[#786a5c]">
                                {cat.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 常見問題一鍵帶入 */}
                    <div className="rounded-xl border border-[#e6d8c8] bg-[#fffaf2] p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#7c5a43]">
                        <Sparkles size={12} />
                        「{currentCategoryMeta.shortLabel}」快速提問範本（點擊可直接帶入）：
                      </p>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {currentCategoryMeta.quickQuestions.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              setSubject(
                                `${currentCategoryMeta.shortLabel}：${q.slice(0, 18)}…`,
                              );
                              setMessage(q);
                            }}
                            className="rounded-lg border border-[#e2d2be] bg-white px-2.5 py-1.5 text-left text-xs text-[#594b3e] transition-colors hover:border-[#935941] hover:text-[#935941]"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 自動夾帶毛孩體質檔案 */}
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#d8e2d8] bg-[#f4f8f4] p-3 text-xs">
                      <input
                        type="checkbox"
                        checked={attachPet}
                        onChange={(e) => setAttachPet(e.target.checked)}
                        className="mt-0.5 accent-[#4e6752]"
                      />
                      <div>
                        <span className="flex items-center gap-1.5 font-bold text-[#38523c]">
                          <PawPrint size={13} />
                          同步附上目前毛孩檔案供營養師與客服判讀
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#5c705e]">
                          {petSummaryText}
                        </span>
                      </div>
                    </label>

                    {/* 聯絡人與選填訂單編號 */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-xs font-bold text-[#5a4d41]">
                        您的稱呼
                        <input
                          type="text"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          placeholder="例：麻糬媽咪"
                          className="input !mt-1 !min-h-9 !py-1.5 text-xs"
                        />
                      </label>
                      <label className="text-xs font-bold text-[#5a4d41]">
                        聯絡 Email
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="通知回覆用信箱"
                          className="input !mt-1 !min-h-9 !py-1.5 text-xs"
                        />
                      </label>
                      <label className="text-xs font-bold text-[#5a4d41]">
                        關聯訂單編號（選填）
                        <input
                          type="text"
                          value={orderId}
                          onChange={(e) => setOrderId(e.target.value)}
                          placeholder="例：PS-202611"
                          className="input !mt-1 !min-h-9 !py-1.5 text-xs"
                        />
                      </label>
                    </div>

                    {/* 主旨與訊息內容 */}
                    <div>
                      <label className="block text-xs font-bold text-[#5a4d41]">
                        問題主旨
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder={`請簡述您的${currentCategoryMeta.shortLabel}需求`}
                          className="input !mt-1 text-xs"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#5a4d41]">
                        詳細諮詢訊息
                        <textarea
                          required
                          rows={3}
                          maxLength={1500}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="請輸入想詢問的細節，後台客服與營養師將依您的問題分類與會員等級優先回覆…"
                          className="input !mt-1 min-h-20 text-xs"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-tactile flex w-full items-center justify-center gap-2 bg-[#935941] py-3 text-xs font-bold text-white hover:bg-[#7d4934] disabled:opacity-50"
                    >
                      <Send size={14} />
                      {submitting
                        ? "正在傳送至後台客服中心…"
                        : `以「${currentTierMeta.label}」通道送出（分類：${currentCategoryMeta.shortLabel}）`}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* 諮詢單切換列 */}
                    {threads.length > 0 ? (
                      <>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {threads.map((t) => {
                            const cat =
                              SUPPORT_CATEGORIES.find(
                                (c) => c.id === t.category,
                              ) ?? SUPPORT_CATEGORIES[0]!;
                            const active = activeThread?.id === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveThreadId(t.id)}
                                className={`min-w-[185px] shrink-0 rounded-xl border p-2.5 text-left transition-all ${
                                  active
                                    ? "border-[#935941] bg-[#fdf5ea] shadow-2xs"
                                    : "border-[#e6d8c8] bg-white hover:border-[#c8b29b]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="rounded bg-[#935941]/12 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#935941]">
                                    {cat.shortLabel}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-[#7c6a58]">
                                    P{t.tierPriority}·{t.memberTierLabel}
                                  </span>
                                </div>
                                <p className="mt-1.5 truncate text-xs font-bold text-[#302b26]">
                                  {t.subject}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        {activeThread && (
                          <div className="rounded-2xl border border-[#e2d3c1] bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efe4d6] pb-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                      MEMBER_TIER_META[activeThread.memberTier]
                                        .badgeBg
                                    } ${
                                      MEMBER_TIER_META[activeThread.memberTier]
                                        .badgeText
                                    } ${
                                      MEMBER_TIER_META[activeThread.memberTier]
                                        .badgeBorder
                                    }`}
                                  >
                                    {activeThread.memberTierLabel}（P
                                    {activeThread.tierPriority}）
                                  </span>
                                  <span
                                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                      STATUS_META[activeThread.status].badge
                                    }`}
                                  >
                                    {STATUS_META[activeThread.status].label}
                                  </span>
                                </div>
                                <h3 className="mt-1.5 text-sm font-bold text-[#302b26]">
                                  {activeThread.subject}
                                </h3>
                                {activeThread.petSummary && (
                                  <p className="mt-0.5 text-[11px] text-[#4e6752]">
                                    毛孩檔案：{activeThread.petSummary}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* 對話訊息氣泡串 */}
                            <div className="my-3.5 max-h-60 space-y-3 overflow-y-auto pr-1">
                              {activeThread.messages.map((msg) => {
                                const isAdmin = msg.sender === "ADMIN";
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex flex-col ${
                                      isAdmin ? "items-start" : "items-end"
                                    }`}
                                  >
                                    <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-[#7c6d5e]">
                                      {isAdmin ? (
                                        <ShieldCheck
                                          size={12}
                                          className="text-[#4e6752]"
                                        />
                                      ) : (
                                        <UserCheck
                                          size={12}
                                          className="text-[#935941]"
                                        />
                                      )}
                                      <span className="font-bold">
                                        {msg.senderName}
                                      </span>
                                      <span>·</span>
                                      <span>
                                        {new Date(msg.createdAt).toLocaleString(
                                          "zh-TW",
                                          {
                                            month: "numeric",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          },
                                        )}
                                      </span>
                                    </div>
                                    <div
                                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                                        isAdmin
                                          ? "border border-[#cce0ce] bg-[#f2f8f3] text-[#283c2b]"
                                          : "bg-[#935941] text-white"
                                      }`}
                                    >
                                      {msg.body}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* 繼續追問表單 */}
                            <form
                              onSubmit={handleSendReply}
                              className="flex gap-2 border-t border-[#efe4d6] pt-3"
                            >
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="繼續傳送訊息給客服專員…"
                                className="input !mt-0 !min-h-10 flex-1 text-xs"
                              />
                              <button
                                type="submit"
                                disabled={submitting || !replyText.trim()}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#935941] px-4 py-2 text-xs font-bold text-white hover:bg-[#7d4934] disabled:opacity-40"
                              >
                                <Send size={13} />
                                傳送
                              </button>
                            </form>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-2xl border border-[#e6d8c8] bg-white p-8 text-center">
                        <p className="text-sm font-bold text-[#302b26]">
                          目前尚無諮詢紀錄
                        </p>
                        <p className="mt-1 text-xs text-[#7c6e60]">
                          請點擊上方「1. 選擇分類發起諮詢」傳送訊息給我們。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
