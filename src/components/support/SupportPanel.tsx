"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Headset,
  History,
  MessageCircle,
  PawPrint,
  Search,
  Send,
  Star,
  Ticket,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DEFAULT_SUPPORT_SETTINGS,
  categoryLabel,
  type BuyerTicket,
  type SupportSettings,
} from "@/lib/supportDesk";
import type { SupportCategory } from "@/lib/supportTypes";
import "./support.css";

type Snapshot = {
  threads: BuyerTicket[];
  settings: SupportSettings;
  guestCount: number;
  orders: { id: string; status: string; totalNt: number; createdAt: string }[];
};
export const supportTime = (v?: string | null) =>
  v && Number.isFinite(Date.parse(v))
    ? new Date(v).toLocaleString("zh-TW", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "未記錄";
const statusText = {
  OPEN: "待回覆",
  IN_PROGRESS: "處理中",
  RESOLVED: "已完成",
};
export function SupportPanel({
  initialHistory = false,
}: {
  initialHistory?: boolean;
}) {
  const user = useAuthStore((s) => s.user),
    [data, setData] = useState<Snapshot | null>(null),
    [view, setView] = useState<"new" | "active" | "history">(
      initialHistory ? "history" : "new",
    ),
    [id, setId] = useState("");
  const [category, setCategory] = useState<SupportCategory | null>(null),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [order, setOrder] = useState(""),
    [parent, setParent] = useState<string | null>(null),
    [name, setName] = useState(""),
    [email, setEmail] = useState("");
  const [reply, setReply] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<BuyerTicket | null>(null),
    [filter, setFilter] = useState("ALL"),
    [search, setSearch] = useState(""),
    [score, setScore] = useState(0),
    [comment, setComment] = useState("");
  const refs = useRef({ id, view });
  refs.current = { id, view };
  const version = useRef(0),
    alive = useRef(true),
    lock = useRef(false),
    operation = useRef<{ body: string; id: string } | null>(null),
    prior = useRef<Snapshot | null>(null),
    instance = useId();
  const [list] = useAutoAnimate<HTMLDivElement>({ duration: 180 });
  const settings = data?.settings ?? DEFAULT_SUPPORT_SETTINGS;
  const reset = useCallback(() => {
    setCategory(null);
    setSubject("");
    setMessage("");
    setOrder("");
    setParent(null);
    setReply("");
    setId("");
    setView("new");
    setScore(0);
    setComment("");
  }, []);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const sequence = ++version.current;
      let legacy = "";
      try {
        legacy = localStorage.getItem("purespot:support-client-token") ?? "";
      } catch {}
      const r = await fetch(
        `/api/support/chat${legacy ? `?clientToken=${encodeURIComponent(legacy)}` : ""}`,
        { cache: "no-store", signal },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "客服紀錄暫時讀不到");
      if (!alive.current || sequence !== version.current) return;
      const next = d as Snapshot,
        selected = next.threads.find((t) => t.id === refs.current.id);
      const newlyClosed = next.threads.find(
        (t) =>
          t.status === "RESOLVED" &&
          prior.current?.threads.some(
            (old) => old.id === t.id && old.status !== "RESOLVED",
          ),
      );
      if (newlyClosed) setNotice(newlyClosed);
      if (!prior.current && !initialHistory)
        try {
          const saved = localStorage.getItem(
              `support-active:${user?.id ?? "guest"}`,
            ),
            ongoing = next.threads.find(
              (t) => t.id === saved && t.status !== "RESOLVED",
            );
          if (ongoing) {
            setId(ongoing.id);
            setView("active");
          }
        } catch {}
      if (selected?.status === "RESOLVED" && refs.current.view === "active") {
        setNotice(selected);
        reset();
      } else if (!prior.current) {
        const completed = next.threads
          .filter((t) => t.resolvedAt)
          .sort(
            (a, b) => Date.parse(b.resolvedAt!) - Date.parse(a.resolvedAt!),
          )[0];
        try {
          if (
            completed &&
            !localStorage.getItem(
              `support-seen:${user?.id ?? "guest"}:${completed.id}`,
            )
          )
            setNotice(completed);
        } catch {}
      }
      if (!prior.current && initialHistory) {
        const requested = new URLSearchParams(window.location.search).get(
            "ticket",
          ),
          match = next.threads.find((t) => t.id === requested);
        if (match) {
          setId(match.id);
          setView(match.status === "RESOLVED" ? "history" : "active");
          setNotice(null);
        }
      }
      prior.current = next;
      setData(next);
      if (legacy)
        try {
          localStorage.removeItem("purespot:support-client-token");
        } catch {}
    },
    [reset, user?.id, initialHistory],
  );
  useEffect(() => {
    alive.current = true;
    const abort = new AbortController();
    prior.current = null;
    reset();
    setView(initialHistory ? "history" : "new");
    setName("");
    setEmail("");
    setData(null);
    setId("");
    setNotice(null);
    setError("");
    void load(abort.signal).catch((e) => {
      if (!abort.signal.aborted) setError(e.message);
    });
    const tick = setInterval(() => {
      if (!document.hidden && !lock.current) void load().catch(() => {});
    }, 8000);
    const focus = () => {
      if (!document.hidden && !lock.current) void load().catch(() => {});
    };
    document.addEventListener("visibilitychange", focus);
    return () => {
      alive.current = false;
      version.current++;
      abort.abort();
      clearInterval(tick);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [load, reset, initialHistory]);
  useEffect(() => {
    setReply("");
    setScore(0);
    setComment("");
  }, [id]);
  async function send(body: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    version.current++;
    const serialized = JSON.stringify(body);
    if (operation.current?.body !== serialized)
      operation.current = { body: serialized, id: crypto.randomUUID() };
    try {
      const r = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, requestId: operation.current.id }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status < 500) operation.current = null;
        throw Error(d.error || "訊息未送出，請再試一次");
      }
      if (!alive.current) return;
      if (body.action === "create") {
        setId(d.thread.id);
        setView("active");
        try {
          localStorage.setItem(
            `support-active:${user?.id ?? "guest"}`,
            d.thread.id,
          );
        } catch {}
        setSubject("");
        setMessage("");
        setParent(null);
      }
      if (body.action === "reply") setReply("");
      await load();
      operation.current = null;
      return d;
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "暫時無法送出，內容已保留");
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function seen(t: BuyerTicket) {
    try {
      localStorage.setItem(`support-seen:${user?.id ?? "guest"}:${t.id}`, "1");
    } catch {}
    setNotice(null);
  }
  function open(t: BuyerTicket) {
    if (t.status !== "RESOLVED")
      try {
        localStorage.setItem(`support-active:${user?.id ?? "guest"}`, t.id);
      } catch {}
    setId(t.id);
    setView(t.status === "RESOLVED" ? "history" : "active");
    setError("");
    if (t.status === "RESOLVED") seen(t);
  }
  function follow(t: BuyerTicket) {
    reset();
    setCategory(t.category);
    setSubject(`關於：${t.subject}`.slice(0, 120));
    setParent(t.id);
    setOrder(t.orderId ?? "");
  }
  const active = data?.threads.find((t) => t.id === id),
    rows = (data?.threads ?? [])
      .filter(
        (t) =>
          (view === "history"
            ? t.status === "RESOLVED"
            : t.status !== "RESOLVED") &&
          (filter === "ALL" || t.category === filter) &&
          `${t.subject} ${t.messages.map((m) => m.body).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
      .sort(
        (a, b) =>
          Date.parse(b.resolvedAt || b.updatedAt) -
          Date.parse(a.resolvedAt || a.updatedAt),
      );
  const selected = settings.categories.find((c) => c.id === category),
    pending = data?.threads.filter((t) => t.status !== "RESOLVED").length ?? 0;
  return (
    <div className="support-panel">
      <div className="support-panel-intro">
        <span>
          <Headset size={17} />
          PURESPOT 客服
        </span>
        <h2>{initialHistory ? "每次詢問，都留得下來。" : "有什麼想問的？"}</h2>
        <p>提出問題、查看回覆，或翻翻上次的處理紀錄。</p>
      </div>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="support-completed"
          role="status"
        >
          <CheckCircle2 size={23} />
          <div>
            <strong>「{notice.subject}」已完成</strong>
            <p>本次對話已存入歷史，可以開始新的詢問。</p>
            <button type="button" onClick={() => open(notice)}>
              查看最後回覆 <ArrowRight size={13} />
            </button>
          </div>
          <button
            type="button"
            aria-label="收起完成通知"
            onClick={() => seen(notice)}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
      <nav className="support-tabs" aria-label="客服功能">
        {(
          [
            ["new", "新諮詢"],
            ["active", `進行中${pending ? ` · ${pending}` : ""}`],
            ["history", "詢問歷史"],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={view === key}
            onClick={() => {
              setView(key);
              setId("");
              setError("");
            }}
          >
            {view === key && (
              <motion.span
                layoutId={`${instance}-tabs`}
                className="support-tab-bg"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {error && (
        <div className="support-error" role="alert">
          {error}
          {!data && (
            <button
              type="button"
              onClick={() =>
                void load()
                  .then(() => setError(""))
                  .catch((e) => setError(e.message))
              }
            >
              重新讀取
            </button>
          )}
        </div>
      )}
      {!data && !error && <p className="support-empty">正在讀取客服紀錄…</p>}
      {user && !!data?.guestCount && (
        <div className="support-claim">
          <span>
            這個瀏覽器有 {data.guestCount} 筆訪客紀錄，認領後就能跨裝置查看。
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send({ action: "claim" })}
          >
            認領我的紀錄
          </button>
        </div>
      )}
      {view === "new" && (
        <>
          {!category ? (
            <section className="support-pick">
              <h3>先選一個問題分類</h3>
              <div className="support-category-grid">
                {settings.categories.map((c, i) => (
                  <button
                    type="button"
                    key={c.id}
                    disabled={!data}
                    onClick={() => setCategory(c.id)}
                  >
                    <span className={`support-category-icon tone-${i % 5}`}>
                      {i === 0 ? (
                        <PawPrint size={21} />
                      ) : i === 3 ? (
                        <Ticket size={21} />
                      ) : i === 6 ? (
                        <Star size={21} />
                      ) : (
                        <MessageCircle size={21} />
                      )}
                    </span>
                    <strong>{c.label}</strong>
                    <small>{c.description}</small>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <form
              className="support-form"
              onSubmit={(e) => {
                e.preventDefault();
                void send({
                  action: "create",
                  category,
                  subject,
                  message,
                  buyerName: name,
                  buyerEmail: email,
                  orderId: order || null,
                  parentId: parent,
                });
              }}
            >
              <button
                className="support-back"
                type="button"
                onClick={() => {
                  setCategory(null);
                  setOrder("");
                }}
              >
                <ArrowLeft size={14} />
                重新選分類
              </button>
              <h3>{selected?.label}</h3>
              {parent && (
                <div className="support-parent">
                  接續案件 #{parent.slice(-8)} 的問題，原對話會完整保留。
                </div>
              )}
              <div className="support-prompts">
                {selected?.prompts.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => {
                      setSubject(p.slice(0, 120));
                      setMessage(p);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {!user && (
                <div className="support-form-row">
                  <label>
                    稱呼（選填）
                    <input
                      maxLength={60}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    Email（選填）
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                </div>
              )}
              {user &&
                ["ORDER", "AFTER_SALES", "AUTOSHIP"].includes(category) && (
                  <label>
                    關聯訂單
                    <select
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                    >
                      <option value="">不指定訂單</option>
                      {data?.orders.map((o) => (
                        <option value={o.id} key={o.id}>
                          #{o.id.slice(0, 8)} · NT${o.totalNt.toLocaleString()}{" "}
                          · {supportTime(o.createdAt)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              <label>
                問題主旨
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="例如：想確認這筆訂單的配送安排"
                />
              </label>
              <label>
                問題內容
                <textarea
                  required
                  minLength={2}
                  maxLength={1500}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="說明遇到的情況與需要我們協助的地方。"
                />
              </label>
              <div className="support-form-foot">
                <small>{message.length}／1500</small>
                <button
                  className="support-primary"
                  type="submit"
                  disabled={busy || !data}
                >
                  <Send size={15} />
                  {busy ? "正在送出…" : "送出諮詢"}
                </button>
              </div>
              <p className="support-hint">
                {user
                  ? "對話會保存到你的會員帳戶。"
                  : "訪客紀錄保存在這個瀏覽器；登入後可認領到帳戶。"}
              </p>
            </form>
          )}
        </>
      )}
      {view !== "new" && (
        <>
          {!active ? (
            <>
              <div className="support-filters">
                <label>
                  <Search size={16} />
                  <input
                    aria-label="搜尋詢問紀錄"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜尋主旨或對話"
                  />
                </label>
                <select
                  aria-label="詢問紀錄分類"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="ALL">所有分類</option>
                  {settings.categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="support-ticket-list" ref={list}>
                {rows.map((t) => (
                  <button
                    type="button"
                    className="support-ticket-card"
                    key={t.id}
                    onClick={() => open(t)}
                  >
                    <div>
                      <span className="support-category-tag">
                        {categoryLabel(t.category, settings)}
                      </span>
                      <span className={`support-status status-${t.status}`}>
                        {statusText[t.status]}
                      </span>
                    </div>
                    <h3>{t.subject}</h3>
                    <p>{t.messages.at(-1)?.body}</p>
                    <footer>
                      <span>{supportTime(t.resolvedAt || t.updatedAt)}</span>
                      <span>
                        {t.messages.length} 則訊息 <ArrowRight size={13} />
                      </span>
                    </footer>
                  </button>
                ))}
                {!rows.length && (
                  <div className="support-empty">
                    <History size={28} />
                    <h3>
                      {search || filter !== "ALL"
                        ? "沒有符合的紀錄"
                        : view === "history"
                          ? "完成的諮詢會留在這裡"
                          : "目前沒有待處理的諮詢"}
                    </h3>
                    <button type="button" onClick={reset}>
                      開始新諮詢 <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <section className="support-conversation">
              <button
                className="support-back"
                type="button"
                onClick={() => setId("")}
              >
                <ArrowLeft size={14} />
                返回{view === "history" ? "詢問歷史" : "進行中"}
              </button>
              <div className="support-conversation-title">
                <span className="support-category-tag">
                  {categoryLabel(active.category, settings)}
                </span>
                <span className={`support-status status-${active.status}`}>
                  {statusText[active.status]}
                </span>
                <h3>{active.subject}</h3>
                <small>
                  案件 #{active.id.slice(-8)} · {supportTime(active.createdAt)}
                </small>
                {active.parentId && (
                  <button
                    type="button"
                    onClick={() => {
                      const t = data?.threads.find(
                        (t) => t.id === active.parentId,
                      );
                      if (t) open(t);
                    }}
                  >
                    查看原諮詢 #{active.parentId.slice(-8)}
                  </button>
                )}
              </div>
              <div className="support-messages">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`support-message sender-${m.sender}`}
                  >
                    <span>
                      {m.sender === "ADMIN" ? "PURESPOT 客服" : "你"} ·{" "}
                      {active.source === "ORDER_REQUEST" &&
                      m.id === `${active.id}-m2`
                        ? "時間未記錄"
                        : supportTime(m.createdAt)}
                    </span>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>
              {active.status !== "RESOLVED" ? (
                <form
                  className="support-reply"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send({
                      action: "reply",
                      threadId: active.id,
                      message: reply,
                    });
                  }}
                >
                  <label>
                    補充訊息
                    <textarea
                      rows={3}
                      minLength={2}
                      maxLength={1500}
                      required
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="補充這筆諮詢需要的資訊"
                    />
                  </label>
                  <button className="support-primary" disabled={busy}>
                    <Send size={14} />
                    {busy ? "正在送出…" : "送出補充"}
                  </button>
                </form>
              ) : (
                <>
                  <div className="support-closed-summary">
                    <CheckCircle2 size={20} />
                    <div>
                      <strong>這筆諮詢已完成</strong>
                      <p>
                        {active.resolvedAt
                          ? `完成時間：${supportTime(active.resolvedAt)}`
                          : "已保存完整對話"}
                      </p>
                    </div>
                    <button
                      className="support-primary"
                      type="button"
                      onClick={() => follow(active)}
                    >
                      另開相關諮詢
                    </button>
                  </div>
                  {active.feedback ? (
                    <div className="support-rating-saved">
                      <Star size={17} />
                      {active.feedback.score}／5 · 謝謝你的回饋
                      {active.feedback.comment && (
                        <p>{active.feedback.comment}</p>
                      )}
                    </div>
                  ) : (
                    <form
                      className="support-rating"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send({
                          action: "rate",
                          id: active.id,
                          score,
                          comment,
                        });
                      }}
                    >
                      <h4>這次服務，有幫上忙嗎？</h4>
                      <div
                        className="support-stars"
                        role="group"
                        aria-label="服務評分"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            type="button"
                            key={n}
                            aria-label={`${n} 分`}
                            aria-pressed={score === n}
                            onClick={() => setScore(n)}
                          >
                            <Star
                              size={27}
                              fill={n <= score ? "currentColor" : "none"}
                            />
                          </button>
                        ))}
                      </div>
                      <label>
                        想告訴我們的話（選填）
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </label>
                      <button
                        type="submit"
                        className="support-primary"
                        disabled={!score || busy}
                      >
                        送出評價
                      </button>
                      <p className="support-hint">每筆完成的諮詢可評價一次。</p>
                    </form>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}
      {!initialHistory && user && (
        <Link className="support-account-link" href="/account?tab=support">
          到我的帳戶查看客服紀錄 <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
