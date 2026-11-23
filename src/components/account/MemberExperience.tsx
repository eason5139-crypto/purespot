"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Gift,
  Lock,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest } from "@/lib/accountTypes";
import { money } from "@/lib/utils";
import { MEMBER_RULES, TIER_CODES } from "@/lib/memberPolicy";
import { POINTS_SHOP_CATALOG, canUnlockByTier } from "@/lib/pointsShopCatalog";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { getProduct } from "@/lib/catalog";
const PointsArcadeHub = dynamic(
  () => import("./PointsArcadeHub").then((m) => m.PointsArcadeHub),
  {
    ssr: false,
    loading: () => <p className="py-6 text-sm">正在準備互動畫面…</p>,
  },
);
type Snapshot = Awaited<
  ReturnType<typeof import("@/server/membership").membershipSnapshot>
>;
export type MemberView = "membership" | "shop" | "tickets" | "tasks" | "games";
const dates = (v: unknown) =>
  new Date(String(v)).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
const labels = {
  membership: "我的會員權益",
  shop: "點數商店",
  tickets: "我的票券",
  tasks: "簽到與任務",
  games: "毛孩遊戲室",
};
export function MemberExperience({
  view = "membership",
}: {
  view?: MemberView;
}) {
  const user = useAuthStore((s) => s.user),
    openAuth = useUiStore((s) => s.setAuthOpen);
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const [category, setCategory] = useState("ALL"),
    [ticketStatus, setTicketStatus] = useState("AVAILABLE");
  const [list] = useAutoAnimate<HTMLDivElement>();
  const load = useCallback(async () => {
    const id = useAuthStore.getState().user?.id;
    if (!id) return;
    try {
      const result = await accountJson<Snapshot>("/api/account/membership");
      if (useAuthStore.getState().user?.id === id) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (useAuthStore.getState().user?.id === id)
        setError(e instanceof Error ? e.message : "無法載入會員資料");
    }
  }, []);
  useEffect(() => {
    setData(null);
    setError("");
    if (user) void load();
  }, [user?.id, load]);
  async function exchange(id: string, action: "exchange_shop" | "redeem") {
    if (!user) {
      openAuth(true);
      return;
    }
    setBusy(id);
    try {
      await accountJson(
        "/api/account/membership",
        jsonRequest(
          "POST",
          action === "redeem"
            ? { action, rewardId: id }
            : { action, itemId: id },
        ),
      );
      await load();
      toast.success("已完成兌換，可在我的票券查看");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "兌換失敗");
    } finally {
      setBusy("");
    }
  }
  if (!user)
    return (
      <section className="member-empty">
        <Coins size={32} />
        <h1>{labels[view]}</h1>
        <p>登入後查看點數、會員權益與可兌換的選物。</p>
        <button className="member-primary" onClick={() => openAuth(true)}>
          登入或建立帳戶
          <ArrowRight size={17} />
        </button>
      </section>
    );
  if (!data)
    return (
      <div role="status" className="py-10 text-sm">
        <p>{error || "正在整理會員資料…"}</p>
        {error && (
          <button className="member-secondary mt-5" onClick={() => void load()}>
            重新載入會員資料
          </button>
        )}
      </div>
    );
  const status = data.membership,
    rule = status.current;
  const available = data.redemptions.filter((r) => r.status === "AVAILABLE");
  return (
    <div className={`member-experience member-view-${view}`}>
      <header className="member-heading">
        <div>
          <h1>{labels[view]}</h1>
          <p>
            {view === "shop"
              ? "把日常累積的點數，換成用得上的選物。"
              : view === "tickets"
                ? "使用條件、有效日期與使用狀態，都在這裡。"
                : view === "membership"
                  ? "每一份權益，都有清楚的規則。"
                  : "讓今天多一點小小的期待。"}
          </p>
        </div>
        <div className="member-balance">
          <Coins size={20} />
          <strong>{data.points.toLocaleString()}</strong>
          <span>可用點數</span>
        </div>
      </header>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {view === "membership" && (
        <>
          <section className={`member-pass tier-${rule.code.toLowerCase()}`}>
            <div>
              <span className="member-level">
                LEVEL {TIER_CODES.indexOf(rule.code) + 1} / 5
              </span>
              <h2>
                <Crown size={26} />
                {rule.name}
              </h2>
              <p>權益有效至 {dates(status.cycle.expiresAt)}</p>
              <strong className="member-rate">
                {rule.earnPercent}
                <small>% 購物回饋</small>
              </strong>
            </div>
            <div className="member-pass-progress">
              <p>
                近六個月完成訂單消費 <strong>{money(status.spendNt)}</strong>
              </p>
              <div className="member-progress">
                <span
                  style={{
                    width: `${Math.min(100, status.next ? (status.spendNt / status.next.spendNt) * 100 : 100)}%`,
                  }}
                />
              </div>
              <p>
                {status.next
                  ? `再消費 ${money(status.upgradeRemainingNt)} 可升為${status.next.name}`
                  : "已是最高等級，謝謝你的每一份信任。"}
              </p>
              <div className="member-renew">
                <CheckCircle2 size={17} />
                {status.renewRemainingNt > 0
                  ? `續等還差 ${money(status.renewRemainingNt)}，到期時再依近六個月消費核對。`
                  : `目前已達續等門檻 ${money(rule.retainNt)}；到期時會再次核對。`}
              </div>
            </div>
          </section>
          <section className="member-panel">
            <h2>五個等級，差別一次看懂。</h2>
            <div className="member-table-scroll">
              <table className="member-tier-table">
                <thead>
                  <tr>
                    <th>權益</th>
                    {status.policy.tiers.map((t) => (
                      <th key={t.code} data-current={t.code === rule.code}>
                        {t.name}
                        {t.code === rule.code && <span>目前等級</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "半年升等消費",
                      ...status.policy.tiers.map((t) =>
                        t.spendNt ? money(t.spendNt) : "註冊即享",
                      ),
                    ],
                    [
                      "半年續等消費",
                      ...status.policy.tiers.map((t) => money(t.retainNt)),
                    ],
                    [
                      "購物點數回饋",
                      ...status.policy.tiers.map((t) => `${t.earnPercent}%`),
                    ],
                    [
                      "商品優惠",
                      ...status.policy.tiers.map((t) =>
                        t.discountPercent
                          ? `${(100 - t.discountPercent) / 10} 折`
                          : "原價",
                      ),
                    ],
                    [
                      "升等或續等券",
                      ...status.policy.tiers.map((t) =>
                        t.couponNt
                          ? `${money(t.couponNt)}／滿 ${money(t.couponMinNt)}`
                          : "—",
                      ),
                    ],
                    [
                      "免運門檻",
                      ...status.policy.tiers.map((t) =>
                        money(t.freeShippingNt),
                      ),
                    ],
                    [
                      "點數商城換購價",
                      ...status.policy.tiers.map(
                        (t) => `${Math.round(t.shopRate * 100)}% 點數`,
                      ),
                    ],
                    [
                      "點數折抵上限",
                      ...status.policy.tiers.map(
                        (t) =>
                          `商品折後金額 ${Math.round(t.maxRedeemRatio * 100)}%`,
                      ),
                    ],
                    ["客服權益", ...status.policy.tiers.map((t) => t.support)],
                  ].map(([name, ...values]) => (
                    <tr key={name}>
                      <th>{name}</th>
                      {values.map((v, i) => (
                        <td
                          key={i}
                          data-current={
                            status.policy.tiers[i]!.code === rule.code
                          }
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="member-panel">
            <h2>怎麼升等、怎麼續等？</h2>
            <ol className="member-rules">
              {MEMBER_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-[#647581]">
              例：5 月 10 日升為暖心夥伴，保留到 11 月 10
              日。到期時近六個月完成消費滿 6,000 元就續等；若只有 3,000
              元，調整為日常夥伴，而不是直接回到初見會員。
            </p>
          </section>
          <section className="member-panel">
            <h2>五等會員徽章</h2>
            <div className="member-badges">
              {status.policy.tiers.map((t, i) => (
                <div
                  key={t.code}
                  data-earned={i <= TIER_CODES.indexOf(rule.code)}
                >
                  <Crown size={30} />
                  <strong>
                    Lv.{i + 1} · {t.name}
                  </strong>
                  <p>
                    {t.spendNt
                      ? `半年消費 ${money(t.spendNt)}`
                      : "加入會員即享"}
                  </p>
                  <span>
                    {t.code === rule.code
                      ? "目前等級"
                      : i < TIER_CODES.indexOf(rule.code)
                        ? "已達門檻"
                        : "尚未達成"}
                  </span>
                </div>
              ))}
            </div>
            <h2 className="mt-7">陪伴留下的任務徽章</h2>
            <div className="member-badges">
              {data.badges.map((b) => (
                <div key={b.title} data-earned={b.earned}>
                  <Award size={30} />
                  <strong>{b.title}</strong>
                  <p>{b.missionTitle}</p>
                  <span>{b.earned ? "已獲得" : "尚未完成"}</span>
                </div>
              ))}
            </div>
            <Link href="/account?tab=tasks" className="member-text-link">
              看看可以完成的任務
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="member-panel">
            <h2>點數明細</h2>
            <div className="member-ledger">
              {data.entries.slice(0, 15).map((e) => (
                <div key={e.id}>
                  <span>
                    {e.title}
                    <small>{dates(e.createdAt)}</small>
                  </span>
                  <strong>
                    {e.points > 0 ? "+" : ""}
                    {e.points}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {view === "shop" && (
        <>
          <div className="member-toolbar">
            {[
              ["ALL", "全部"],
              ["TASTER_PACK", "食物試吃"],
              ["CRAFT_GOODS", "生活用品"],
              ["CASH_VOUCHER", "優惠券"],
              ["CHARITY_MEAL", "助糧回饋"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={category === value}
                onClick={() => setCategory(value!)}
              >
                {label}
              </button>
            ))}
          </div>
          <div ref={list} className="member-shop-grid">
            {POINTS_SHOP_CATALOG.filter(
              (p) => category === "ALL" || p.category === category,
            ).map((item) => {
              const product = item.linkedProductId
                  ? getProduct(item.linkedProductId)
                  : null,
                cost = Math.max(1, Math.round(item.pointsCost * rule.shopRate)),
                unlocked = canUnlockByTier(rule.code, item.requiredTier);
              return (
                <article key={item.id} className="member-shop-item">
                  <div className="member-shop-image">
                    {product ? (
                      <Image
                        src={product.image}
                        alt={item.title}
                        fill
                        sizes="300px"
                        className="object-contain p-5"
                      />
                    ) : item.category === "CASH_VOUCHER" ? (
                      <>
                        <Ticket size={48} />
                        <strong>
                          {money(item.voucherDiscountNt ?? item.retailValueNt)}
                        </strong>
                      </>
                    ) : (
                      <Gift size={64} />
                    )}
                  </div>
                  <div className="p-5">
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    {item.category === "CASH_VOUCHER" && (
                      <small className="mt-2 block text-xs text-[#647581]">
                        滿票券金額可用，兌換後 60 天有效；每筆限一張。
                      </small>
                    )}
                    <div className="member-item-cost">
                      <strong>{cost.toLocaleString()} 點</strong>
                      {cost < item.pointsCost && (
                        <del>{item.pointsCost} 點</del>
                      )}
                    </div>
                    <button
                      className="member-primary"
                      disabled={
                        busy === item.id || !unlocked || data.points < cost
                      }
                      onClick={() => void exchange(item.id, "exchange_shop")}
                    >
                      {!unlocked ? (
                        <>
                          <Lock size={16} />
                          較高等級專屬
                        </>
                      ) : data.points < cost ? (
                        "點數不足"
                      ) : busy === item.id ? (
                        "兌換中…"
                      ) : (
                        "使用點數兌換"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {(category === "ALL" || category === "CASH_VOUCHER") &&
            data.rewards.length > 0 && (
              <section className="member-panel">
                <h2>其他優惠兌換</h2>
                <div className="member-shop-grid">
                  {data.rewards.map((r) => (
                    <article key={r.id} className="member-reward">
                      <Ticket size={28} />
                      <h3>{r.title}</h3>
                      <strong>{r.pointsCost} 點</strong>
                      <button
                        className="member-primary"
                        disabled={busy === r.id || data.points < r.pointsCost}
                        onClick={() => void exchange(r.id, "redeem")}
                      >
                        兌換優惠券
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}
          <Link href="/account?tab=tickets" className="member-text-link">
            查看已兌換的票券
            <ArrowRight size={16} />
          </Link>
        </>
      )}
      {view === "tickets" && (
        <>
          <div className="member-toolbar">
            {[
              ["AVAILABLE", "可使用"],
              ["USED", "已使用"],
              ["EXPIRED", "已到期"],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={ticketStatus === v}
                onClick={() => setTicketStatus(v!)}
              >
                {l} {data.redemptions.filter((r) => r.status === v).length}
              </button>
            ))}
          </div>
          <div ref={list} className="member-ticket-grid">
            {data.redemptions
              .filter((r) => r.status === ticketStatus)
              .map((r) => (
                <article key={r.id} className="member-ticket">
                  <div className="member-ticket-value">
                    <Ticket size={28} />
                    <strong>{money(r.discountNt)}</strong>
                  </div>
                  <div className="member-ticket-body">
                    <h2>{r.reward.title}</h2>
                    <p>
                      {r.minSpendNt
                        ? `折後商品滿 ${money(r.minSpendNt)} 可用`
                        : "請依票券指定商品使用"}
                    </p>
                    <p>
                      {r.expiresAt
                        ? `有效至 ${dates(r.expiresAt)}`
                        : "有效日期依原兌換規則"}{" "}
                      · 每筆限用一張
                    </p>
                    <code>{r.code}</code>
                    <div className="mt-4 flex gap-4">
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(r.code);
                          toast.success("已複製票券代碼");
                        }}
                        className="member-text-link"
                      >
                        <Copy size={15} />
                        複製
                      </button>
                      {r.status === "AVAILABLE" && (
                        <Link
                          href={`/checkout?coupon=${r.code}`}
                          className="member-text-link"
                        >
                          結帳使用
                          <ArrowRight size={15} />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
          {!data.redemptions.some((r) => r.status === ticketStatus) && (
            <p className="member-panel text-center">這裡目前沒有票券。</p>
          )}
          {data.shopExchanges.length > 0 && (
            <section className="member-panel">
              <h2>換購紀錄</h2>
              <div className="member-ledger">
                {data.shopExchanges.map((e) => (
                  <div key={e.id}>
                    <span>
                      {e.title}
                      <small>{dates(e.createdAt)}</small>
                    </span>
                    <strong>{e.pointsCost} 點</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {(view === "tasks" || view === "games") && (
        <PointsArcadeHub
          mode={view}
          isLoggedIn
          points={data.points}
          arcadeConfig={data.arcadeConfig}
          checkInStatus={data.checkInStatus}
          arcadeLimits={data.arcadeLimits}
          arcadeTasks={data.arcadeTasks}
          onRequireAuth={() => openAuth(true)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
