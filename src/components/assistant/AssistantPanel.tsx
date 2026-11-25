"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  History,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AssistantResult,
  AssistantThread,
  AssistantTurn,
  PublicAssistantSettings,
} from "@/lib/assistant";
import { useAuthStore } from "@/store/useAuthStore";
import { useActivePet, usePetContextStore } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { triggerFlyToCart } from "@/lib/flyToCart";
import type { Product } from "@/lib/types";
import { matchProduct } from "@/lib/matching";

const LOCAL_KEY = "purespot-little-p-history-v1";
type CurrentTurn = AssistantTurn & { pending?: boolean };
function localThreads(): AssistantThread[] {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (t) =>
              typeof t.id === "string" &&
              typeof t.title === "string" &&
              typeof t.updatedAt === "string" &&
              Array.isArray(t.turns) &&
              t.turns.every(
                (r: AssistantTurn) =>
                  r &&
                  typeof r.question === "string" &&
                  typeof r.answer === "string" &&
                  r.result &&
                  Array.isArray(r.result.followUps) &&
                  Array.isArray(r.result.products) &&
                  Array.isArray(r.result.documents) &&
                  r.result.products.every(
                    (p) =>
                      typeof p.id === "string" &&
                      typeof p.name === "string" &&
                      Array.isArray(p.ingredients),
                  ) &&
                  r.result.documents.every(
                    (d) =>
                      typeof d.title === "string" &&
                      typeof d.href === "string" &&
                      typeof d.text === "string",
                  ),
              ),
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export default function AssistantPanel({
  settings,
  onClose,
}: {
  settings: PublicAssistantSettings;
  onClose: () => void;
}) {
  const userId = useAuthStore((s) => s.user?.id),
    pet = useActivePet();
  const catalog = useCatalogStore((s) => s.products);
  const [question, setQuestion] = useState(""),
    [turns, setTurns] = useState<CurrentTurn[]>([]),
    [threads, setThreads] = useState<AssistantThread[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>(),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState(false),
    [historyBusy, setHistoryBusy] = useState(false);
  const [error, setError] = useState(""),
    [savedWarning, setSavedWarning] = useState(""),
    [cartBusy, setCartBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    abort = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const [list] = useAutoAnimate<HTMLDivElement>({ duration: 160 });
  const identity = useRef(userId);
  identity.current = userId;
  const refreshHistory = useCallback(async () => {
    if (!userId) {
      setThreads(localThreads());
      return;
    }
    setHistoryBusy(true);
    try {
      const r = await fetch("/api/assistant/history", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (identity.current === userId) setThreads(d.threads);
    } catch {
      if (identity.current === userId)
        setSavedWarning("對話紀錄暫時讀不到，仍可先搜尋站內內容。");
    } finally {
      setHistoryBusy(false);
    }
  }, [userId]);
  useEffect(() => {
    abort.current?.abort();
    setTurns([]);
    setThreadId(undefined);
    setThreads([]);
    setHistory(false);
    setError("");
    setBusy(false);
    setSavedWarning("");
    void refreshHistory();
    input.current?.focus({ preventScroll: true });
    return () => abort.current?.abort();
  }, [userId, refreshHistory]);
  useEffect(() => {
    if (turns.length)
      bottom.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [turns.length]);
  function persistGuest(id: string, turn: AssistantTurn) {
    const old = localThreads(),
      existing = old.find((t) => t.id === id);
    const thread = {
      id,
      title: existing?.title ?? turn.question.slice(0, 32),
      turns: [
        ...(existing?.turns.filter((t) => t.id !== turn.id) ?? []),
        turn,
      ].slice(-20),
      updatedAt: turn.createdAt,
    };
    const next = [thread, ...old.filter((t) => t.id !== id)].slice(0, 20);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      setThreads(next);
    } catch {
      setSavedWarning("瀏覽器空間不足，這次對話只保留在開啟的視窗。");
    }
  }
  async function ask(value: string) {
    const q = value.trim();
    if (!q || busy) return;
    const owner = userId,
      id = crypto.randomUUID();
    abort.current?.abort();
    const control = new AbortController();
    abort.current = control;
    setQuestion("");
    setError("");
    setHistory(false);
    setBusy(true);
    setSavedWarning("");
    const pending: CurrentTurn = {
      id,
      question: q,
      answer: "",
      createdAt: new Date().toISOString(),
      pending: true,
      result: {
        category: "other",
        products: [],
        documents: [],
        answer: "",
        followUps: [],
        compareHref: null,
        accountRequired: false,
        sourceStatus: "current",
        canAddToCart: false,
      },
    };
    setTurns((prev) => [...prev, pending]);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: control.signal,
        body: JSON.stringify({
          question: q,
          threadId,
          requestId: id,
          petId: pet.cloudId,
          history: turns.slice(-4).map((t) => ({
            question: t.question,
            productIds: t.result.products.map((p) => p.id),
          })),
        }),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "小P暫時讀不到資料，請稍後再試。");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("回覆連線中斷，請再試一次。");
      const decoder = new TextDecoder();
      let buffer = "",
        final = false;
      let serverMember: boolean | undefined;
      while (true) {
        const chunk = await reader.read();
        if (identity.current !== owner || control.signal.aborted) {
          await reader.cancel();
          return;
        }
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "results") {
            serverMember = event.member;
            setThreadId(event.threadId);
            setTurns((prev) =>
              prev.map((t) =>
                t.id === id
                  ? { ...t, result: event.result, answer: event.result.answer }
                  : t,
              ),
            );
          }
          if (event.type === "answer")
            setTurns((prev) =>
              prev.map((t) =>
                t.id === id ? { ...t, answer: event.answer } : t,
              ),
            );
          if (event.type === "error") throw new Error(event.error);
          if (event.type === "done") {
            final = true;
            setTurns((prev) => prev.map((t) => (t.id === id ? event.turn : t)));
            if (serverMember === false)
              persistGuest(
                event.turn.id === id ? (threadId ?? id) : id,
                event.turn,
              );
            else if (!event.saved)
              setSavedWarning("這次回覆已顯示，但未能同步到對話紀錄。");
          }
        }
        if (chunk.done) break;
      }
      if (!final)
        throw new Error("連線已中斷；已找到的內容仍可點選，也可以重新提問。");
      if (owner) void refreshHistory();
    } catch (e) {
      if (control.signal.aborted) return;
      setError(
        e instanceof Error ? e.message : "搜尋暫時無法完成，請再試一次。",
      );
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                pending: false,
                answer: t.answer || "這次沒能完成搜尋，請再試一次。",
              }
            : t,
        ),
      );
    } finally {
      if (identity.current === owner && !control.signal.aborted) {
        setBusy(false);
        input.current?.focus({ preventScroll: true });
      }
    }
  }
  async function removeHistory(id?: string) {
    if (busy) return;
    setError("");
    setConfirmDelete(false);
    try {
      if (userId) {
        const r = await fetch("/api/assistant/history", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!r.ok) throw new Error("對話暫時刪不掉，請再試一次。");
      } else {
        const next = id ? localThreads().filter((t) => t.id !== id) : [];
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      }
      if (!id || id === threadId) {
        setTurns([]);
        setThreadId(undefined);
      }
      await refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    }
  }
  async function addToCart(productId: string, button: HTMLButtonElement) {
    if (cartBusy) return;
    setCartBusy(productId);
    try {
      const r = await fetch("/api/products", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || d.source === "fallback")
        throw new Error("目前無法確認庫存，請先開啟商品頁。");
      useCatalogStore.getState().setProducts(d.products as Product[]);
      const current = usePetContextStore.getState(),
        chosen = current.allPets.find((p) => p.id === current.activePetId);
      if (!chosen) throw new Error("請先選擇適用的毛孩。");
      useCartStore.getState().addItem({
        productId,
        petId: chosen.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      const p = (d.products as Product[]).find((p) => p.id === productId);
      triggerFlyToCart(button, { image: p?.image, label: p?.name });
      toast.success(`已加入${chosen.name}的購物籃`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加車失敗，請再試一次。");
    } finally {
      setCartBusy(null);
    }
  }
  function newChat() {
    if (busy) return;
    setTurns([]);
    setThreadId(undefined);
    setHistory(false);
    setError("");
    input.current?.focus();
  }
  const last = turns.at(-1);
  return (
    <section
      id="little-p-dialog"
      role="dialog"
      aria-modal="false"
      aria-labelledby="little-p-title"
      className="little-p-dialog"
    >
      <header className="little-p-panel-header">
        <span className="little-p-avatar" aria-hidden="true" />
        <div>
          <h2 id="little-p-title">小P的搜尋本</h2>
          <p>找東西、找功能，慢慢問。</p>
        </div>
        <button
          type="button"
          className="little-p-icon"
          aria-label="查看對話紀錄"
          aria-pressed={history}
          onClick={() => {
            setHistory((v) => !v);
            void refreshHistory();
          }}
        >
          <History size={18} />
        </button>
        <button
          type="button"
          className="little-p-icon"
          aria-label="關閉小P搜尋"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="little-p-toolbar">
        <span>
          {userId ? "對話保存在你的帳戶" : "訪客對話只保留在此瀏覽器"}
        </span>
        <button type="button" disabled={busy} onClick={newChat}>
          <Plus size={13} />
          新對話
        </button>
      </div>
      <div className="little-p-content">
        {history ? (
          <div className="little-p-history">
            <div className="little-p-history-heading">
              <h3>詢問紀錄</h3>
              {threads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                >
                  全部刪除
                </button>
              )}
            </div>
            {confirmDelete && (
              <div className="mb-3 rounded-xl bg-[#fff1e5] p-3 text-xs">
                刪除全部對話？刪除後便無法還原。
                <div className="mt-2 flex gap-4">
                  <button
                    type="button"
                    className="font-semibold text-[#a36045]"
                    onClick={() => void removeHistory()}
                  >
                    確定刪除
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}>
                    保留紀錄
                  </button>
                </div>
              </div>
            )}
            {historyBusy && <p>正在讀取紀錄…</p>}
            {!historyBusy && !threads.length && (
              <p className="little-p-muted">
                還沒有保存的對話。問小P一個問題，就會出現在這裡。
              </p>
            )}
            {threads.map((t) => (
              <div className="little-p-history-row" key={t.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setThreadId(t.id);
                    setTurns(t.turns);
                    setHistory(false);
                  }}
                >
                  <strong>{t.title}</strong>
                  <span>
                    {new Date(t.updatedAt).toLocaleDateString("zh-TW")} ·{" "}
                    {t.turns.length} 個問題
                  </span>
                </button>
                <button
                  type="button"
                  className="little-p-icon"
                  aria-label={`刪除對話：${t.title}`}
                  disabled={busy}
                  onClick={() => void removeHistory(t.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div ref={list} className="little-p-turns">
            {!turns.length && (
              <div className="little-p-welcome">
                <span className="little-p-welcome-cat" aria-hidden="true" />
                <p>{settings.welcome}</p>
                <div className="little-p-quick">
                  {settings.quickQuestions.map((q) => (
                    <button type="button" key={q} onClick={() => void ask(q)}>
                      <Search size={13} />
                      {q}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t) => (
              <article className="little-p-turn" key={t.id}>
                <time className="little-p-muted" dateTime={t.createdAt}>
                  {new Date(t.createdAt).toLocaleString("zh-TW", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <p className="little-p-question">{t.question}</p>
                {t.pending && !t.answer ? (
                  <p role="status" className="little-p-pending">
                    <Loader2 size={14} className="animate-spin" />
                    正在翻站內資料…
                  </p>
                ) : null}
                {t.result.products.length > 0 && (
                  <div
                    className="little-p-product-results"
                    aria-label="找到的商品"
                  >
                    {t.result.products.map((p) => {
                      const current = catalog.find((v) => v.id === p.id);
                      const match = current ? matchProduct(current, pet) : null;
                      const warning =
                        p.warning ??
                        (match && !match.safe ? match.label : null);
                      return (
                        <div className="little-p-product" key={p.id}>
                          <Link
                            href={`/products/${p.slug}`}
                            onClick={onClose}
                            tabIndex={-1}
                            aria-hidden="true"
                          >
                            <Image
                              src={p.image}
                              alt=""
                              width={66}
                              height={66}
                            />
                          </Link>
                          <div>
                            <Link
                              href={`/products/${p.slug}`}
                              onClick={onClose}
                            >
                              {p.name}
                              <ArrowUpRight size={12} />
                            </Link>
                            <p>
                              NT${p.priceNt.toLocaleString()} ·{" "}
                              {p.stock > 0 ? `庫存 ${p.stock}` : "暫時缺貨"}
                            </p>
                            {t.result.category === "ingredients" && (
                              <small>
                                原料：{p.ingredients.join("、") || "待補充"}
                              </small>
                            )}
                            {t.result.category === "ingredients" && (
                              <small>
                                蛋白{" "}
                                {p.proteinMin === null
                                  ? "未登載"
                                  : `${p.proteinMin}%`}{" "}
                                · 熱量{" "}
                                {p.kcalPer100g === null
                                  ? "未登載"
                                  : `${p.kcalPer100g} 大卡 / 100g`}
                              </small>
                            )}
                            {warning && (
                              <small className="little-p-safety">
                                {warning}
                              </small>
                            )}
                            {t.result.canAddToCart && (
                              <button
                                type="button"
                                disabled={
                                  !!warning || p.stock < 1 || cartBusy === p.id
                                }
                                onClick={(e) =>
                                  void addToCart(p.id, e.currentTarget)
                                }
                              >
                                {cartBusy === p.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <ShoppingBag size={12} />
                                )}
                                加入{pet.name}的購物籃
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {t.result.documents.length > 0 && (
                  <div
                    className="little-p-document-results"
                    aria-label="找到的功能與資料"
                  >
                    {t.result.documents.map((d) => (
                      <Link key={d.id} href={d.href} onClick={onClose}>
                        <span>
                          {d.private ? (
                            <Check size={14} />
                          ) : (
                            <ArrowUpRight size={14} />
                          )}
                        </span>
                        <div>
                          <strong>{d.title}</strong>
                          {!d.private && (
                            <p>
                              {d.text.slice(0, 75)}
                              {d.text.length > 75 ? "…" : ""}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {t.answer && <p className="little-p-answer">{t.answer}</p>}
                {t.result.sourceStatus === "partial" && (
                  <p className="little-p-muted">
                    部分資料暫時讀不到，可以先使用已找到的結果。
                  </p>
                )}
                {t.result.accountRequired && (
                  <button
                    type="button"
                    className="little-p-primary"
                    onClick={() => {
                      onClose();
                      useUiStore.getState().setAuthOpen(true);
                    }}
                  >
                    登入查看我的資料
                  </button>
                )}
                {t.result.compareHref && (
                  <Link
                    href={t.result.compareHref}
                    onClick={onClose}
                    className="little-p-compare"
                  >
                    並排看這兩款成分
                    <ArrowUpRight size={14} />
                  </Link>
                )}
                {t.pending && t.answer && (
                  <p className="little-p-refining" role="status">
                    <span />
                    小P正在整理說明，結果已可以點選。
                  </p>
                )}
              </article>
            ))}
            {last && !busy && (
              <div className="little-p-followups">
                {last.result.followUps.map((q) => (
                  <button type="button" key={q} onClick={() => void ask(q)}>
                    {q}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>
      {error && (
        <p className="little-p-error" role="alert">
          {error}
        </p>
      )}
      {savedWarning && (
        <p className="little-p-warning" role="status">
          {savedWarning}
        </p>
      )}
      <form
        className="little-p-form"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label className="sr-only" htmlFor="little-p-question">
          想問小P什麼？
        </label>
        <MessageCircle size={17} aria-hidden="true" />
        <input
          ref={input}
          id="little-p-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="想找什麼，直接問我…"
          maxLength={500}
          autoComplete="off"
          disabled={busy}
        />
        <button
          type="submit"
          aria-label="送出問題"
          disabled={busy || !question.trim()}
        >
          {busy ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <ArrowUp size={18} />
          )}
        </button>
      </form>
    </section>
  );
}
