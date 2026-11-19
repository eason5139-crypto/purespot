"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  Filter,
  Headset,
  Layers,
  PawPrint,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  MEMBER_TIER_META,
  SUPPORT_CATEGORIES,
  type MemberTierCode,
  type SupportCategory,
  type SupportThread,
  type SupportTicketStatus,
} from "@/lib/supportTypes";
import { money } from "@/lib/utils";

const STATUS_NAME: Record<SupportTicketStatus, string> = {
  OPEN: "待處理",
  IN_PROGRESS: "處理中",
  RESOLVED: "已完成",
};

const STATUS_STYLE: Record<SupportTicketStatus, string> = {
  OPEN: "border-[#dfb892] bg-[#fdf5ea] text-[#935941]",
  IN_PROGRESS: "border-[#b8ceb9] bg-[#eef4ef] text-[#3d5c43]",
  RESOLVED: "border-[#d8cec2] bg-[#f4efe8] text-[#75685c]",
};

export default function AdminSupportPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<SupportTicketStatus>("IN_PROGRESS");
  const [categoryEdit, setCategoryEdit] =
    useState<SupportCategory>("NUTRITION");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // 篩選器：狀態、問題分類、會員等級
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">(
    "pending",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | SupportCategory
  >("ALL");
  const [tierFilter, setTierFilter] = useState<"ALL" | MemberTierCode>("ALL");

  async function load() {
    try {
      const result = await fetch("/api/admin/support", { cache: "no-store" });
      const data = (await result.json()) as {
        threads?: SupportThread[];
        requests?: SupportThread[];
        error?: string;
      };
      const list = data.threads ?? data.requests;
      if (!result.ok || !list) {
        throw new Error(data.error || "無法載入客服諮詢單");
      }
      setThreads(list);
      if (!activeId && list[0]) {
        setActiveId(list[0].id);
      }
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "無法載入客服諮詢單",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    return threads.filter((item) => {
      if (statusFilter === "pending" && item.status === "RESOLVED") {
        return false;
      }
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      if (tierFilter !== "ALL" && item.memberTier !== tierFilter) {
        return false;
      }
      return true;
    });
  }, [threads, statusFilter, categoryFilter, tierFilter]);

  const active =
    visible.find((item) => item.id === activeId) ??
    threads.find((item) => item.id === activeId) ??
    visible[0] ??
    null;

  useEffect(() => {
    if (active) {
      setStatus(active.status === "OPEN" ? "IN_PROGRESS" : active.status);
      setCategoryEdit(active.category);
      setResponse("");
    }
  }, [active?.id]);

  async function save() {
    if (!active) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: active.id,
          status,
          category: categoryEdit,
          response: response.trim() || null,
        }),
      });
      const data = (await result.json()) as {
        thread?: SupportThread;
        request?: SupportThread;
        error?: string;
      };
      const updated = data.thread ?? data.request;
      if (!result.ok || !updated) {
        throw new Error(data.error || "儲存失敗");
      }
      setThreads((prev) =>
        prev.map((item) => (item.id === active.id ? updated : item)),
      );
      setResponse("");
      setNotice(
        `已送出回覆並更新狀態為「${STATUS_NAME[updated.status]}」，買家前台客服視窗與會員通知中心已即時同步。`,
      );
      toast.success("已送出客服回覆並同步至買家端");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  // 分級與分類統計
  const stats = useMemo(() => {
    const pending = threads.filter((t) => t.status !== "RESOLVED");
    return {
      totalPending: pending.length,
      goldPending: pending.filter((t) => t.memberTier === "GOLD").length,
      silverPending: pending.filter((t) => t.memberTier === "SILVER").length,
      memberPending: pending.filter(
        (t) => t.memberTier === "MEMBER" || t.memberTier === "GUEST",
      ).length,
      byCategory: SUPPORT_CATEGORIES.map((cat) => ({
        ...cat,
        count: threads.filter((t) => t.category === cat.id).length,
      })),
    };
  }, [threads]);

  const activeCategoryMeta =
    SUPPORT_CATEGORIES.find((c) => c.id === (active?.category ?? "NUTRITION")) ??
    SUPPORT_CATEGORIES[0]!;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="rounded-2xl border border-[#e5d8c8] bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[#302b26]">
            <Headset size={24} className="text-[#935941]" />
            客服管理
          </h1>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8c8b4] bg-white px-4 py-2 text-xs font-bold text-[#5e5043] transition-colors hover:bg-[#faf3e8]"
          >
            <RefreshCw size={14} />
            更新
          </button>
        </div>

        {/* 會員等級分級優先佇列指標卡 */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#dfb86c] bg-[#fcf5e3] p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#8a5812]">
                <Crown size={13} />
                P1 · 星光夥伴 VIP
              </span>
              <span className="rounded-full bg-[#8a5812] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                最優先
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#302b26]">
              {stats.goldPending} <span className="text-xs font-normal">件待辦</span>
            </p>
            <p className="mt-0.5 text-[11px] text-[#7c5c28]">
              累計消費滿 NT$12,000 · 15 分鐘 SLA
            </p>
          </div>

          <div className="rounded-2xl border border-[#b8ceb9] bg-[#f1f7f2] p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#3d5c43]">
                <Award size={13} />
                P2 · 暖心夥伴
              </span>
              <span className="rounded-full bg-[#4e6752] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                優先處理
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#302b26]">
              {stats.silverPending}{" "}
              <span className="text-xs font-normal">件待辦</span>
            </p>
            <p className="mt-0.5 text-[11px] text-[#526d57]">
              累計消費滿 NT$3,000 · 1 小時 SLA
            </p>
          </div>

          <div className="rounded-2xl border border-[#dec7b0] bg-[#faf3eb] p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-[#935941]">
                P3/P4 · 新朋友與訪客
              </span>
              <span className="rounded-full bg-[#935941]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#935941]">
                標準佇列
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#302b26]">
              {stats.memberPending}{" "}
              <span className="text-xs font-normal">件待辦</span>
            </p>
            <p className="mt-0.5 text-[11px] text-[#7a634f]">
              一般會員與售前營養諮詢
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3d5c4] bg-white p-4">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#6e5f50]">
              <Layers size={13} className="text-[#935941]" />
              五大問題分類分布
            </span>
            <div className="mt-2 space-y-1">
              {stats.byCategory.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-[#5e5145]">{c.shortLabel}</span>
                  <span className="font-mono font-bold text-[#935941]">
                    {c.count} 件
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 雙層篩選工具列：第一排依會員等級、第二排依問題分類與處理狀態 */}
      <div className="rounded-2xl border border-[#e6d8c8] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5e5043] mr-1">
            <Crown size={14} className="text-[#935941]" />
            會員等級分級篩選：
          </span>
          {(
            [
              ["ALL", "全部等級"],
              ["GOLD", "P1 星光夥伴 VIP"],
              ["SILVER", "P2 暖心夥伴"],
              ["MEMBER", "P3 新朋友會員"],
              ["GUEST", "P4 訪客諮詢"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setTierFilter(code)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                tierFilter === code
                  ? "bg-[#935941] text-white shadow-2xs"
                  : "border border-[#e2d4c3] bg-[#faf6f0] text-[#685a4d] hover:border-[#935941]"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                statusFilter === "pending"
                  ? "bg-[#4e6752] text-white"
                  : "border border-[#d8cec2] bg-white text-[#5e5145]"
              }`}
            >
              未結案 ({stats.totalPending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                statusFilter === "all"
                  ? "bg-[#4e6752] text-white"
                  : "border border-[#d8cec2] bg-white text-[#5e5145]"
              }`}
            >
              全部工單 ({threads.length})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#f0e6d9] pt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5e5043] mr-1">
            <Filter size={14} className="text-[#935941]" />
            問題分類篩選：
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              categoryFilter === "ALL"
                ? "bg-[#302b26] text-white"
                : "border border-[#e2d4c3] bg-[#faf6f0] text-[#685a4d] hover:border-[#935941]"
            }`}
          >
            全部問題分類
          </button>
          {SUPPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                categoryFilter === cat.id
                  ? "bg-[#302b26] text-white"
                  : "border border-[#e2d4c3] bg-[#faf6f0] text-[#685a4d] hover:border-[#935941]"
              }`}
            >
              {cat.shortLabel} (
              {threads.filter((t) => t.category === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-[#b8ceb9] bg-[#eef4ef] p-4 text-sm font-medium text-[#35523a]"
        >
          {notice}
        </p>
      )}

      {/* 左側分級佇列清單 + 右側客服對話與回覆工作台 */}
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-2.5">
          {visible.map((ticket) => {
            const tierMeta = MEMBER_TIER_META[ticket.memberTier];
            const catMeta =
              SUPPORT_CATEGORIES.find((c) => c.id === ticket.category) ??
              SUPPORT_CATEGORIES[0]!;
            const isSelected = active?.id === ticket.id;
            const lastMsg = ticket.messages[ticket.messages.length - 1];

            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setActiveId(ticket.id)}
                aria-pressed={isSelected}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-[#935941] bg-[#fdf5ea] shadow-[0_3px_0_#935941]"
                    : "border-[#e6d8c8] bg-white hover:border-[#c8b29b]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${tierMeta.badgeBg} ${tierMeta.badgeText} ${tierMeta.badgeBorder}`}
                  >
                    <Crown size={10} />
                    P{ticket.tierPriority} · {ticket.memberTierLabel}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      STATUS_STYLE[ticket.status]
                    }`}
                  >
                    {STATUS_NAME[ticket.status]}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <span className="rounded bg-[#935941]/12 px-2 py-0.5 font-mono text-[10px] font-bold text-[#935941]">
                    {catMeta.shortLabel}
                  </span>
                  <strong className="truncate text-sm text-[#302b26]">
                    {ticket.buyerName}
                  </strong>
                </div>

                <p className="mt-1.5 truncate text-xs font-bold text-[#4a3e33]">
                  {ticket.subject}
                </p>

                {lastMsg && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#7c6e60]">
                    {lastMsg.sender === "ADMIN" ? "客服回覆：" : "買家訊息："}
                    {lastMsg.body}
                  </p>
                )}

                <div className="mt-2.5 flex items-center justify-between border-t border-[#efe4d6] pt-2 text-[11px] text-[#8a7c6e]">
                  <span>
                    累計消費 {money(ticket.totalSpentNt)} ({ticket.ordersCount}{" "}
                    單)
                  </span>
                  <span>
                    {new Date(ticket.updatedAt).toLocaleDateString("zh-TW")}
                  </span>
                </div>
              </button>
            );
          })}

          {visible.length === 0 && (
            <div className="rounded-2xl border border-[#e6d8c8] bg-white p-8 text-center text-sm text-[#82776d]">
              目前在此分級與問題分類下沒有待處理的諮詢單。
            </div>
          )}
        </aside>

        {active && (
          <section className="rounded-[24px] border border-[#e6d8c8] bg-white p-6 shadow-xs sm:p-8">
            {/* 買家身分、會員等級與毛孩檔案摘要區 */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ece0d1] pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                      MEMBER_TIER_META[active.memberTier].badgeBg
                    } ${MEMBER_TIER_META[active.memberTier].badgeText} ${
                      MEMBER_TIER_META[active.memberTier].badgeBorder
                    }`}
                  >
                    <Crown size={13} />
                    P{active.tierPriority} · {active.memberTierLabel}
                  </span>
                  <span className="rounded-full bg-[#935941]/12 px-3 py-1 text-xs font-bold text-[#935941]">
                    分類：{activeCategoryMeta.label}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      STATUS_STYLE[active.status]
                    }`}
                  >
                    {STATUS_NAME[active.status]}
                  </span>
                </div>

                <h2 className="editorial-title mt-3 text-2xl font-bold text-[#302b26]">
                  {active.subject}
                </h2>
                <p className="mt-1 text-xs text-[#6e6052]">
                  買家：<strong>{active.buyerName}</strong> ({active.buyerEmail}
                  ) · 累計消費{" "}
                  <strong className="font-mono text-[#935941]">
                    {money(active.totalSpentNt)}
                  </strong>{" "}
                  · 歷史訂單 {active.ordersCount} 筆
                  {active.orderId ? ` · 關聯訂單 #${active.orderId}` : ""}
                </p>

                {active.petSummary && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cfe0d0] bg-[#f3f8f3] px-3.5 py-2 text-xs font-semibold text-[#36533b]">
                    <PawPrint size={14} className="text-[#4e6752]" />
                    <span>買家毛孩體質檔案：{active.petSummary}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 多輪對話時間軸 */}
            <div className="my-6 space-y-4 rounded-2xl border border-[#eadfce] bg-[#faf6f0] p-5 max-h-[380px] overflow-y-auto">
              {active.messages.map((msg) => {
                const isAdmin = msg.sender === "ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isAdmin ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 px-1 text-xs text-[#78695b]">
                      {isAdmin ? (
                        <ShieldCheck size={14} className="text-[#4e6752]" />
                      ) : (
                        <UserCheck size={14} className="text-[#935941]" />
                      )}
                      <strong className="text-[#302b26]">
                        {msg.senderName}
                      </strong>
                      <span>·</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleString("zh-TW")}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap shadow-2xs ${
                        isAdmin
                          ? "border border-[#b9d0bb] bg-[#eef5ef] text-[#243827]"
                          : "border border-[#e2d2be] bg-white text-[#302b26]"
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#e6d8c8] bg-[#fffaf2] p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#935941]">
                <Sparkles size={14} />
                快速回覆範本
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {activeCategoryMeta.adminTemplates.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResponse(tpl)}
                    className="rounded-xl border border-[#e2d2be] bg-white p-3 text-left text-xs leading-5 text-[#524539] transition-all hover:border-[#935941] hover:bg-[#fdf5ea]"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            {/* 管理員分類調整、狀態變更與回覆輸入框 */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#302b26]">
                問題分類歸檔
                <select
                  value={categoryEdit}
                  onChange={(e) =>
                    setCategoryEdit(e.target.value as SupportCategory)
                  }
                  className="input mt-1.5"
                >
                  {SUPPORT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold text-[#302b26]">
                更新處理狀態
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as SupportTicketStatus)
                  }
                  className="input mt-1.5"
                >
                  <option value="OPEN">待處理 (OPEN)</option>
                  <option value="IN_PROGRESS">處理中 (IN_PROGRESS)</option>
                  <option value="RESOLVED">已完成結案 (RESOLVED)</option>
                </select>
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-[#302b26]">
                傳送回覆訊息給買家（{active.buyerName} ·{" "}
                {active.memberTierLabel}）
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  maxLength={1500}
                  rows={4}
                  placeholder="輸入給買家的專業建議或處理進度，送出後買家可立即於前台線上客服視窗與會員中心收到…"
                  className="input mt-1.5 min-h-28"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#7c6e60]">
                送出後將同步寫入對話紀錄並發送會員站內通知
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="btn-tactile inline-flex min-h-11 items-center gap-2 bg-[#935941] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#7d4934] disabled:opacity-50"
              >
                <Send size={16} />
                {saving ? "正在傳送並儲存…" : "送出客服回覆並更新狀態"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
