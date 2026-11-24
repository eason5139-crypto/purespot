"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headset,
  History,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Settings,
  Tags,
  X,
} from "lucide-react";
import {
  DEFAULT_SUPPORT_SETTINGS,
  categoryLabel,
  dateKey,
  type SupportSettings,
} from "@/lib/supportDesk";
import {
  MEMBER_TIER_META,
  type SupportCategory,
  type SupportThread,
} from "@/lib/supportTypes";
import { SupportCharts } from "./SupportCharts";
import { supportTime } from "./SupportPanel";
import "./support.css";
type Data = { threads: SupportThread[]; settings: SupportSettings };
const statusName = {
  OPEN: "待回覆",
  IN_PROGRESS: "處理中",
  RESOLVED: "已完成",
};
type Draft = {
  response: string;
  note: string;
  tags: string;
  category: SupportCategory;
};
async function api(body: unknown) {
  const r = await fetch("/api/admin/support", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "儲存失敗，請再試一次");
  return d;
}
export function AdminSupportDesk() {
  const [data, setData] = useState<Data | null>(null),
    [view, setView] = useState<"inbox" | "history" | "charts" | "settings">(
      "inbox",
    ),
    [id, setId] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [confirm, setConfirm] = useState(false),
    [batchCategory, setBatchCategory] = useState(""),
    [batchClose, setBatchClose] = useState(false);
  const [category, setCategory] = useState("ALL"),
    [status, setStatus] = useState("ACTIVE"),
    [search, setSearch] = useState(""),
    [tier, setTier] = useState("ALL"),
    [page, setPage] = useState(0),
    [from, setFrom] = useState(() =>
      dateKey(new Date(Date.now() - 29 * 86400000).toISOString()),
    ),
    [to, setTo] = useState(() => dateKey(new Date().toISOString()));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [orderState, setOrderState] = useState("loading"),
    [order, setOrder] = useState<{
      id: string;
      status: string;
      totalNt: number;
      createdAt: string;
      items: { productName: string; quantity: number; unitPriceNt: number }[];
    } | null>(null);
  const lock = useRef(false),
    alive = useRef(true),
    seq = useRef(0),
    tabId = useId(),
    [list] = useAutoAnimate<HTMLDivElement>({ duration: 180 }),
    operation = useRef<{ key: string; id: string } | null>(null);
  const load = useCallback(async () => {
    const n = ++seq.current;
    const r = await fetch("/api/admin/support", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "客服資料暫時讀不到");
    if (alive.current && n === seq.current) setData(d as Data);
  }, []);
  useEffect(() => {
    alive.current = true;
    void load().catch((e) => setError(e.message));
    const timer = setInterval(() => {
      if (!document.hidden && !lock.current) void load().catch(() => {});
    }, 10000);
    return () => {
      alive.current = false;
      seq.current++;
      clearInterval(timer);
    };
  }, [load]);
  const settings = data?.settings ?? DEFAULT_SUPPORT_SETTINGS,
    threads = data?.threads ?? [],
    active = threads.find((t) => t.id === id);
  const draft = active
    ? (drafts[id] ?? {
        response: "",
        note: "",
        tags: (active.tags ?? []).join("、"),
        category: active.category,
      })
    : null;
  function write(field: keyof Draft, value: string) {
    if (!active || !draft) return;
    setDrafts((prev) => ({ ...prev, [id]: { ...draft, [field]: value } }));
  }
  useEffect(() => {
    setPage(0);
  }, [view, category, status, search, tier, from, to]);
  useEffect(() => {
    setOrder(null);
    setOrderState("loading");
    if (!active?.orderId) return;
    const abort = new AbortController();
    void fetch(
      `/api/admin/support?orderId=${encodeURIComponent(active.orderId)}`,
      { signal: abort.signal, cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        setOrder(d.order);
        setOrderState(d.order ? "ready" : "missing");
      })
      .catch(() => {
        if (!abort.signal.aborted) setOrderState("missing");
      });
    return () => abort.abort();
  }, [active?.orderId]);
  const rows = useMemo(
    () =>
      threads
        .filter((t) => {
          if (
            view === "history"
              ? t.status !== "RESOLVED"
              : status === "ACTIVE"
                ? t.status === "RESOLVED"
                : status !== "ALL" && t.status !== status
          )
            return false;
          if (
            (category !== "ALL" && t.category !== category) ||
            (tier !== "ALL" && t.memberTier !== tier)
          )
            return false;
          const day = dateKey(t.createdAt);
          if ((from && day && day < from) || (to && day && day > to))
            return false;
          return `${t.subject} ${t.buyerName} ${t.buyerEmail} ${t.id} ${t.tags?.join(" ")} ${t.messages.map((m) => m.body).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase());
        })
        .sort((a, b) =>
          view === "history"
            ? Date.parse(b.resolvedAt || b.updatedAt) -
              Date.parse(a.resolvedAt || a.updatedAt)
            : a.tierPriority - b.tierPriority ||
              Date.parse(a.createdAt) - Date.parse(b.createdAt),
        ),
    [data, view, status, category, tier, search, from, to],
  );
  const visible = rows.slice(page * 20, (page + 1) * 20),
    pending = threads.filter((t) => t.status !== "RESOLVED").length;
  async function save(body: Record<string, unknown>, after?: () => void) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    seq.current++;
    const key = JSON.stringify(body);
    if (operation.current?.key !== key)
      operation.current = { key, id: crypto.randomUUID() };
    try {
      await api({ ...body, requestId: operation.current.id });
      await load();
      operation.current = null;
      after?.();
      setNotice("已儲存，買家端與客服紀錄會同步更新。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗，內容仍保留");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function toggle(t: SupportThread) {
    setSelected((prev) =>
      prev.includes(t.id)
        ? prev.filter((x) => x !== t.id)
        : prev.length < 20
          ? [...prev, t.id]
          : prev,
    );
  }
  return (
    <div className="support-admin">
      <header className="support-admin-header">
        <div>
          <span className="support-eyebrow">
            <Headset size={16} />
            客服工作台
          </span>
          <h1>把每個問題，好好接住。</h1>
          <p>處理對話、整理歷史，也看見買家最需要什麼。</p>
        </div>
        <button
          className="support-secondary"
          type="button"
          disabled={busy}
          onClick={() => void load().catch((e) => setError(e.message))}
        >
          <RefreshCw size={15} />
          更新資料
        </button>
      </header>
      <div className="support-admin-overview">
        <div>
          <span>未結案件</span>
          <strong>{pending}</strong>
        </div>
        <div>
          <span>處理中</span>
          <strong>
            {threads.filter((t) => t.status === "IN_PROGRESS").length}
          </strong>
        </div>
        <div>
          <span>歷史案件</span>
          <strong>
            {threads.filter((t) => t.status === "RESOLVED").length}
          </strong>
        </div>
        <div>
          <span>已收評價</span>
          <strong>{threads.filter((t) => t.feedback).length}</strong>
        </div>
      </div>
      <nav className="support-tabs admin-tabs" aria-label="客服後台功能">
        {(
          [
            ["inbox", "案件處理"],
            ["history", "歷史紀錄"],
            ["charts", "統計圖表"],
            ["settings", "分類與回覆設定"],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={view === key}
            onClick={() => {
              setView(key);
              setId("");
            }}
          >
            {view === key && (
              <motion.span
                className="support-tab-bg"
                layoutId={`${tabId}-admin`}
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
        </div>
      )}
      {notice && (
        <p className="support-saved" role="status">
          <CheckCircle2 size={16} />
          {notice}
        </p>
      )}
      {view !== "settings" && (
        <div className="support-admin-dates">
          <label>
            從
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            到
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          {[7, 30, 90].map((days) => (
            <button
              type="button"
              key={days}
              onClick={() => {
                setTo(dateKey(new Date().toISOString()));
                setFrom(
                  dateKey(
                    new Date(Date.now() - (days - 1) * 86400000).toISOString(),
                  ),
                );
              }}
            >
              近 {days} 天
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const dates = threads
                .map((t) => dateKey(t.createdAt))
                .filter(Boolean)
                .sort();
              setFrom(dates[0] || dateKey(new Date().toISOString()));
              setTo(dateKey(new Date().toISOString()));
            }}
          >
            全部期間
          </button>
        </div>
      )}
      {view === "charts" && (
        <SupportCharts
          tickets={threads}
          settings={settings}
          from={from}
          to={to}
          onPick={(cat, st) => {
            setCategory(cat ?? "ALL");
            setStatus(st ?? "ALL");
            setView(st === "RESOLVED" ? "history" : "inbox");
            setId("");
          }}
        />
      )}
      {view === "settings" && data && (
        <SupportSettingsEditor
          initial={settings}
          onSave={async (value) => {
            setError("");
            try {
              await api({ action: "settings", settings: value });
              await load();
              setNotice("分類、提問與快速回覆已更新。");
            } catch (e) {
              setError(e instanceof Error ? e.message : "設定儲存失敗");
              throw e;
            }
          }}
        />
      )}
      {(view === "inbox" || view === "history") && (
        <>
          <div className="support-filters admin-filters">
            <label>
              <Search size={16} />
              <input
                aria-label="搜尋客服案件"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="主旨、姓名、標籤或對話"
              />
            </label>
            <select
              aria-label="客服問題分類"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ALL">所有問題分類</option>
              {settings.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {view === "inbox" && (
              <select
                aria-label="案件處理狀態"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">所有待辦</option>
                <option value="OPEN">待回覆</option>
                <option value="IN_PROGRESS">處理中</option>
                <option value="ALL">全部狀態</option>
              </select>
            )}
            <select
              aria-label="客服會員等級"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              <option value="ALL">所有會員等級</option>
              {["DIAMOND", "PLATINUM", "GOLD", "SILVER", "MEMBER", "GUEST"].map(
                (t) => (
                  <option key={t} value={t}>
                    {MEMBER_TIER_META[t as keyof typeof MEMBER_TIER_META].label}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="support-bulk-toolbar">
            <label>
              <input
                type="checkbox"
                aria-label="選取目前列表"
                checked={
                  !!visible.length &&
                  visible.every((t) => selected.includes(t.id))
                }
                onChange={(e) =>
                  setSelected(e.target.checked ? visible.map((t) => t.id) : [])
                }
              />
              本頁 {visible.length} 筆
            </label>
            <span>已選 {selected.length}／20 筆</span>
            <button
              className="support-secondary"
              type="button"
              disabled={!selected.length || busy}
              onClick={() => {
                setBatchCategory("");
                setBatchClose(false);
                setConfirm(true);
              }}
            >
              批次處理
            </button>
            {selected.length > 0 && (
              <button type="button" onClick={() => setSelected([])}>
                清除選取
              </button>
            )}
            <span className="support-result-count">
              符合條件 {rows.length} 筆
            </span>
          </div>
          <div className="support-workspace">
            <div className="support-case-list" ref={list}>
              {visible.map((t) => (
                <div
                  className={`support-case ${t.id === id ? "is-selected" : ""}`}
                  key={t.id}
                >
                  <input
                    aria-label={`選取案件 ${t.subject}`}
                    type="checkbox"
                    checked={selected.includes(t.id)}
                    disabled={
                      busy ||
                      (selected.length >= 20 && !selected.includes(t.id))
                    }
                    onChange={() => toggle(t)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setId(t.id);
                      setError("");
                    }}
                  >
                    <div>
                      <span className="support-category-tag">
                        {categoryLabel(t.category, settings)}
                      </span>
                      <span className={`support-status status-${t.status}`}>
                        {statusName[t.status]}
                      </span>
                    </div>
                    <h3>{t.subject}</h3>
                    <p>
                      {t.buyerName} · {t.memberTierLabel}
                    </p>
                    <small>
                      {supportTime(
                        view === "history"
                          ? t.resolvedAt || t.updatedAt
                          : t.createdAt,
                      )}{" "}
                      · {t.messages.length} 則訊息
                    </small>
                    <div className="support-tags">
                      {t.tags?.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </button>
                </div>
              ))}
              {!visible.length && (
                <div className="support-empty">
                  <CheckCircle2 size={30} />
                  <p>目前沒有符合條件的案件</p>
                </div>
              )}
              <div className="support-pagination">
                <button
                  aria-label="客服案件上一頁"
                  type="button"
                  disabled={!page}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  {page + 1}／{Math.max(1, Math.ceil(rows.length / 20))}
                </span>
                <button
                  aria-label="客服案件下一頁"
                  type="button"
                  disabled={(page + 1) * 20 >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
            <section className="support-detail">
              {active && draft ? (
                <>
                  <div className="support-detail-title">
                    <div>
                      <span
                        className={`support-status status-${active.status}`}
                      >
                        {statusName[active.status]}
                      </span>
                      <span className="support-category-tag">
                        {categoryLabel(active.category, settings)}
                      </span>
                    </div>
                    <h2>{active.subject}</h2>
                    <p>
                      {active.buyerName} · {active.memberTierLabel} · #
                      {active.id.slice(-8)}
                    </p>
                    <small>
                      建立 {supportTime(active.createdAt)}
                      {active.resolvedAt &&
                        ` · 完成 ${supportTime(active.resolvedAt)}`}
                    </small>
                    {active.parentId && (
                      <button
                        className="support-back"
                        type="button"
                        onClick={() => {
                          setId(active.parentId!);
                          setView("history");
                        }}
                      >
                        查看原案件 #{active.parentId.slice(-8)}{" "}
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                  {active.orderId && (
                    <details className="support-order" open>
                      <summary>關聯訂單 #{active.orderId.slice(0, 8)}</summary>
                      {order ? (
                        <div>
                          <p>
                            {order.status} · NT${order.totalNt.toLocaleString()}{" "}
                            · {supportTime(order.createdAt)}
                          </p>
                          {order.items.map((item, i) => (
                            <p key={i}>
                              {item.productName} × {item.quantity} · NT$
                              {item.unitPriceNt}
                            </p>
                          ))}
                          <a
                            href="/admin/orders"
                            target="_blank"
                            rel="noreferrer"
                          >
                            到訂單管理查看 <ArrowRight size={12} />
                          </a>
                        </div>
                      ) : (
                        <p>
                          {orderState === "loading"
                            ? "正在讀取訂單摘要…"
                            : "無法讀取訂單，請到訂單管理確認。"}
                        </p>
                      )}
                    </details>
                  )}
                  <div className="support-messages">
                    {active.messages.map((m) => (
                      <div
                        className={`support-message sender-${m.sender}`}
                        key={m.id}
                      >
                        <span>
                          {m.sender === "ADMIN"
                            ? m.senderName
                            : active.buyerName}{" "}
                          ·{" "}
                          {active.source === "ORDER_REQUEST" &&
                          m.id === `${active.id}-m2`
                            ? "時間未記錄"
                            : supportTime(m.createdAt)}
                        </span>
                        <p>{m.body}</p>
                      </div>
                    ))}
                  </div>
                  {active.feedback && (
                    <div className="support-rating-saved">
                      買家評價 {active.feedback.score}／5
                      <p>{active.feedback.comment || "未填寫留言"}</p>
                    </div>
                  )}
                  <div className="support-case-edit">
                    <div className="support-form-row">
                      <label>
                        問題分類
                        <select
                          value={draft.category}
                          onChange={(e) => write("category", e.target.value)}
                        >
                          {settings.categories.map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        標籤（用逗號或頓號分隔）
                        <input
                          value={draft.tags}
                          onChange={(e) => write("tags", e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="support-tag-options">
                      {settings.tags.map((tag) => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() =>
                            write(
                              "tags",
                              [
                                ...new Set([
                                  ...draft.tags
                                    .split(/[,，、]/)
                                    .map((t) => t.trim())
                                    .filter(Boolean),
                                  tag,
                                ]),
                              ].join("、"),
                            )
                          }
                        >
                          ＋{tag}
                        </button>
                      ))}
                    </div>
                    {active.status !== "RESOLVED" && (
                      <>
                        <label>
                          快速回覆
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value)
                                write(
                                  "response",
                                  `${draft.response}${draft.response ? "\n" : ""}${e.target.value}`,
                                );
                            }}
                          >
                            <option value="">選一句，再依本案調整</option>
                            {settings.categories
                              .find((c) => c.id === draft.category)
                              ?.templates.map((text, i) => (
                                <option key={i} value={text}>
                                  {text.slice(0, 70)}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          回覆買家
                          <textarea
                            rows={4}
                            maxLength={1500}
                            value={draft.response}
                            onChange={(e) => write("response", e.target.value)}
                            placeholder="寫下實際已確認的處理結果"
                          />
                        </label>
                      </>
                    )}
                    <label>
                      公司內部備註
                      <textarea
                        rows={2}
                        maxLength={1500}
                        value={draft.note}
                        onChange={(e) => write("note", e.target.value)}
                        placeholder="僅公司後台可見，例如待確認事項"
                      />
                    </label>
                    <div className="support-admin-actions">
                      <button
                        className="support-secondary"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void save(
                            {
                              id: active.id,
                              status:
                                active.status === "RESOLVED"
                                  ? "RESOLVED"
                                  : "IN_PROGRESS",
                              response: draft.response || null,
                              note: draft.note,
                              category: draft.category,
                              tags: draft.tags
                                .split(/[,，、]/)
                                .map((s) => s.trim())
                                .filter(Boolean),
                              expectedVersion: active.version ?? 0,
                            },
                            () =>
                              setDrafts((prev) => {
                                const next = { ...prev };
                                delete next[id];
                                return next;
                              }),
                          )
                        }
                      >
                        {draft.response ? "送出回覆" : "儲存處理內容"}
                      </button>
                      {active.status !== "RESOLVED" && (
                        <button
                          className="support-primary"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void save(
                              {
                                id: active.id,
                                status: "RESOLVED",
                                response: draft.response || null,
                                note: draft.note,
                                category: draft.category,
                                tags: draft.tags
                                  .split(/[,，、]/)
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                                expectedVersion: active.version ?? 0,
                              },
                              () => {
                                setDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[id];
                                  return next;
                                });
                                setId("");
                              },
                            )
                          }
                        >
                          <CheckCircle2 size={16} />
                          {draft.response ? "回覆並完成" : "標記已完成"}
                        </button>
                      )}
                    </div>
                  </div>
                  <details className="support-internal">
                    <summary>內部備註與處理軌跡</summary>
                    {active.internalNotes?.map((n) => (
                      <div key={n.id}>
                        <strong>
                          {n.author} · {supportTime(n.at)}
                        </strong>
                        <p>{n.body}</p>
                      </div>
                    ))}
                    {active.activity?.map((a, i) => (
                      <p key={`${a.at}-${i}`}>
                        {supportTime(a.at)} · {a.author} · {a.action}
                      </p>
                    ))}
                    {!active.internalNotes?.length &&
                      !active.activity?.length && (
                        <p>這筆舊紀錄沒有留下處理軌跡。</p>
                      )}
                  </details>
                </>
              ) : (
                <div className="support-detail-empty">
                  <MessageSquare size={44} />
                  <h2>選一筆諮詢，開始處理。</h2>
                  <p>買家訊息、訂單、內部備註會整理在這裡。</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
      <Dialog.Root open={confirm} onOpenChange={setConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#123047]/35 backdrop-blur-sm" />
          <Dialog.Content className="support-batch-dialog">
            <Dialog.Title>確認批次處理 {selected.length} 筆案件</Dialog.Title>
            <Dialog.Description>
              先核對下方案件，再選擇要套用的操作。
            </Dialog.Description>
            <div className="support-batch-list">
              {selected.map((key) => {
                const t = threads.find((t) => t.id === key);
                return (
                  <p key={key}>
                    <b>{t?.subject}</b>
                    <span>
                      {t && categoryLabel(t.category, settings)} · #
                      {key.slice(-8)}
                    </span>
                  </p>
                );
              })}
            </div>
            <label>
              批次改分類
              <select
                value={batchCategory}
                onChange={(e) => setBatchCategory(e.target.value)}
              >
                <option value="">保留原分類</option>
                {settings.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="support-inline-check">
              <input
                type="checkbox"
                checked={batchClose}
                onChange={(e) => setBatchClose(e.target.checked)}
              />
              將選中的案件標記為已完成
            </label>
            <div className="support-admin-actions">
              <Dialog.Close asChild>
                <button className="support-secondary">取消</button>
              </Dialog.Close>
              <button
                className="support-primary"
                disabled={busy || (!batchCategory && !batchClose)}
                onClick={() =>
                  void save(
                    {
                      action: "batch",
                      ids: selected,
                      ...(batchCategory ? { category: batchCategory } : {}),
                      ...(batchClose ? { status: "RESOLVED" } : {}),
                    },
                    () => {
                      setConfirm(false);
                      setSelected([]);
                      setId("");
                    },
                  )
                }
              >
                {busy ? "處理中…" : "確認套用"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
function SupportSettingsEditor({
  initial,
  onSave,
}: {
  initial: SupportSettings;
  onSave: (s: SupportSettings) => Promise<void>;
}) {
  const [value, setValue] = useState(initial),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="support-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({
            ...value,
            tags: [...new Set(value.tags.map((t) => t.trim()).filter(Boolean))],
            categories: value.categories.map((c) => ({
              ...c,
              prompts: c.prompts.map((p) => p.trim()).filter(Boolean),
              templates: c.templates.map((p) => p.trim()).filter(Boolean),
            })),
          });
        } catch {
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>讓買家找得到，也讓客服好回答。</h2>
      <p>
        九種分類共用在買家提問、歷史搜尋與後台圖表。快速回覆只會帶入草稿，送出前仍可修改。
      </p>
      {value.categories.map((c, i) => (
        <details key={c.id}>
          <summary>
            {i + 1}. {c.label}
          </summary>
          <label>
            分類名稱
            <input
              required
              maxLength={24}
              value={c.label}
              onChange={(e) =>
                setValue({
                  ...value,
                  categories: value.categories.map((x, n) =>
                    n === i ? { ...x, label: e.target.value } : x,
                  ),
                })
              }
            />
          </label>
          <label>
            說明
            <input
              maxLength={100}
              value={c.description}
              onChange={(e) =>
                setValue({
                  ...value,
                  categories: value.categories.map((x, n) =>
                    n === i ? { ...x, description: e.target.value } : x,
                  ),
                })
              }
            />
          </label>
          <label>
            買家常見問法（每行一句）
            <textarea
              rows={3}
              value={c.prompts.join("\n")}
              onChange={(e) =>
                setValue({
                  ...value,
                  categories: value.categories.map((x, n) =>
                    n === i ? { ...x, prompts: e.target.value.split("\n") } : x,
                  ),
                })
              }
            />
          </label>
          <label>
            公司快速回覆（以單獨一行 --- 分隔）
            <textarea
              rows={5}
              value={c.templates.join("\n---\n")}
              onChange={(e) =>
                setValue({
                  ...value,
                  categories: value.categories.map((x, n) =>
                    n === i
                      ? { ...x, templates: e.target.value.split("\n---\n") }
                      : x,
                  ),
                })
              }
            />
          </label>
        </details>
      ))}
      <label>
        常用標籤（用頓號分隔）
        <input
          value={value.tags.join("、")}
          onChange={(e) =>
            setValue({ ...value, tags: e.target.value.split("、") })
          }
        />
      </label>
      <button className="support-primary" disabled={busy}>
        {busy ? "儲存中…" : "儲存客服設定"}
      </button>
    </form>
  );
}
