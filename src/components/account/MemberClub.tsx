"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Bell,
  Calculator,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Dices,
  Gift,
  HeartHandshake,
  Lock,
  LogIn,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest } from "@/lib/accountTypes";
import { money } from "@/lib/utils";
import { getProduct } from "@/lib/catalog";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { triggerFlyToCart, triggerPawBurst } from "@/lib/flyToCart";
import {
  SampleSachetSvg,
  WaxSealStamp,
} from "@/components/ui/CraftEmblems";
import {
  POINTS_SHOP_CATALOG,
  POINTS_SHOP_CATEGORIES,
  TIER_POINTS_PERKS,
  canUnlockByTier,
  discountedPointsCost,
  type PointsItemCategory,
  type PointsShopItem,
} from "@/lib/pointsShopCatalog";
import type { MemberTierCode } from "@/lib/supportTypes";

type Snapshot = {
  points: number;
  spentNt: number;
  tier: string;
  tierCode?: MemberTierCode;
  nextTierNt: number | null;
  dailyDrawClaimed?: boolean;
  shopExchanges?: {
    id: string;
    title: string;
    pointsCost: number;
    createdAt: string;
  }[];
  config: {
    silverSpendNt: number;
    goldSpendNt: number;
    pointsPerHundred?: number;
  };
  badges: {
    title: string;
    missionTitle: string;
    points: number;
    earned: boolean;
  }[];
  entries: { id: string; title: string; points: number; createdAt: string }[];
  rewards: {
    id: string;
    title: string;
    pointsCost: number;
    discountNt: number;
  }[];
  redemptions: {
    id: string;
    code: string;
    discountNt: number;
    reward: { title: string };
  }[];
  notifications: {
    id: string;
    title: string;
    body: string;
    href: string | null;
    readAt: string | null;
    createdAt: string;
  }[];
};

export function MemberClub({ standalone = false }: { standalone?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const openAuth = useUiStore((s) => s.setAuthOpen);

  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<
    "bazaar" | "vault" | "simulator" | "badges" | "history" | "notices"
  >("bazaar");

  // 點數商店篩選與互動狀態
  const [shopCategory, setShopCategory] = useState<"ALL" | PointsItemCategory>(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const [lastExchangeReceipt, setLastExchangeReceipt] = useState<{
    code: string;
    title: string;
    pointsSpent: number;
    category: PointsItemCategory;
  } | null>(null);

  // 每日節氣福引搖獎機狀態
  const [spinning, setSpinning] = useState(false);
  const [drawResult, setDrawResult] = useState<{
    ball: string;
    rank: string;
    points: number;
  } | null>(null);

  // 10元1點・1點折1元試算儀滑桿
  const [simSpendNt, setSimSpendNt] = useState(2400);
  const [simRedeemPts, setSimRedeemPts] = useState(120);

  // 公益助糧累計克數
  const [charityTotalGrams, setCharityTotalGrams] = useState(14600);

  async function load() {
    if (!user) {
      setData(null);
      return;
    }
    try {
      const snap = await accountJson<Snapshot>("/api/account/membership");
      setData(snap);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "會員點數資料暫時無法載入",
      );
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const userTierCode: MemberTierCode = useMemo(() => {
    if (!user) return "GUEST";
    if (data?.tierCode) return data.tierCode;
    if (data?.tier === "星光夥伴") return "GOLD";
    if (data?.tier === "暖心夥伴") return "SILVER";
    return "MEMBER";
  }, [user, data?.tierCode, data?.tier]);

  const currentPoints = data?.points ?? (user ? 120 : 0);
  const target = data?.nextTierNt ?? data?.config.goldSpendNt ?? 12000;
  const percent = Math.min(
    100,
    Math.round(((data?.spentNt ?? 0) / target) * 100),
  );

  // 執行每日節氣福引搖獎
  async function handleDailyDraw(e: React.MouseEvent<HTMLButtonElement>) {
    if (!user) {
      openAuth(true);
      return;
    }
    const btnEl = e.currentTarget;
    setSpinning(true);
    try {
      const res = await accountJson<{
        draw: { ball: string; rank: string; points: number };
      }>("/api/account/membership", jsonRequest("POST", { action: "daily_draw" }));
      window.setTimeout(() => {
        setDrawResult(res.draw);
        setSpinning(false);
        triggerPawBurst(btnEl);
        toast.success(`福引搖獎開出「${res.draw.rank}」，獲得 +${res.draw.points} 點！`);
        void load();
      }, 650);
    } catch (reason) {
      setSpinning(false);
      toast.error(
        reason instanceof Error ? reason.message : "今日已領取過福引點數",
      );
    }
  }

  // 執行點數商店選物換購
  async function handleExchangeItem(
    e: React.MouseEvent<HTMLButtonElement>,
    item: PointsShopItem,
  ) {
    if (!user) {
      openAuth(true);
      return;
    }
    const btnEl = e.currentTarget;
    setBusy(item.id);
    try {
      const res = await accountJson<{
        exchangeCode: string;
        item: PointsShopItem;
        pointsSpent: number;
      }>(
        "/api/account/membership",
        jsonRequest("POST", { action: "exchange_shop", itemId: item.id }),
      );

      triggerPawBurst(btnEl);
      if (item.linkedProductId) {
        const linked = getProduct(item.linkedProductId);
        triggerFlyToCart(btnEl, {
          image: linked?.image,
          label: item.title,
        });
      }
      if (item.category === "CHARITY_MEAL" && item.charityGrams) {
        setCharityTotalGrams((g) => g + item.charityGrams! * 2);
      }

      setLastExchangeReceipt({
        code: res.exchangeCode,
        title: item.title,
        pointsSpent: res.pointsSpent,
        category: item.category,
      });

      await load();
      toast.success(
        `成功以 ${res.pointsSpent} 點換購「${item.title}」（憑證：${res.exchangeCode}）`,
      );
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "點數換購失敗");
    } finally {
      setBusy("");
    }
  }

  async function redeemLegacyReward(id: string) {
    if (!user) {
      openAuth(true);
      return;
    }
    setBusy(id);
    try {
      await accountJson(
        "/api/account/membership",
        jsonRequest("POST", { action: "redeem", rewardId: id }),
      );
      await load();
      toast.success("折抵禮券已放入您的帳戶票券夾，結帳時可直接選用");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "兌換失敗");
    } finally {
      setBusy("");
    }
  }

  async function markRead(id: string) {
    try {
      await accountJson(
        "/api/account/membership",
        jsonRequest("POST", { action: "read", notificationId: id }),
      );
      await load();
    } catch {
      toast.error("通知更新失敗");
    }
  }

  const filteredCatalog = useMemo(() => {
    return POINTS_SHOP_CATALOG.filter((item) => {
      if (shopCategory !== "ALL" && item.category !== shopCategory) {
        return false;
      }
      if (
        searchQuery.trim() &&
        !`${item.title}${item.subtitle}${item.description}${item.tag}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      if (onlyAffordable) {
        const cost = discountedPointsCost(item.pointsCost, userTierCode);
        if (cost > currentPoints) return false;
      }
      return true;
    });
  }, [shopCategory, searchQuery, onlyAffordable, userTierCode, currentPoints]);

  return (
    <section className={standalone ? "page-shell py-10 space-y-8" : "space-y-7"}>
      {/* 頂部標題與點數規則橫幅 */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd0be] bg-[#fffaf2] px-3.5 py-1 font-mono text-xs font-bold tracking-wider text-[#935941]">
            <Coins size={13} />
            POINTS CRAFT BAZAAR · 消費 NT$10 贈 1 點 · 1 點折抵現金 NT$1
          </span>
          <h1 className="editorial-title mt-2.5 text-3xl font-bold text-[#302b26] sm:text-4xl">
            PURESPOT 會員點數商店與等級存摺
          </h1>
          <p className="mt-1.5 text-sm text-[#6b5d50]">
            點數可直接於結帳時 <strong className="text-[#935941]">1 點折抵 NT$1 現金</strong>
            ，或於此處換購隨箱鮮食試吃包、日台工藝器物與價值放大折價禮券。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/checkout"
            className="btn-tactile inline-flex items-center gap-2 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7d4934]"
          >
            <ShoppingBag size={14} />
            前往結帳（1點折NT$1）
          </Link>
          {!standalone && (
            <Link
              href="/rewards"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8c8b4] bg-white px-3.5 py-2.5 text-xs font-bold text-[#5a4b3e] hover:bg-[#f4ece1]"
            >
              全螢幕展開點數商店
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      {/* 頂部雙欄：左欄「會員等級與點數存摺總覽卡」＋ 右欄「每日節氣八角福引搖獎機」 */}
      <div className="grid gap-6 lg:grid-cols-[1.22fr_0.78fr]">
        {/* 左欄：帳戶連動等級與點數存摺 */}
        <div className="craft-letterpress relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5d6c3] pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#935941] px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-white">
                  <Crown size={12} />
                  {user
                    ? `帳戶核定等級：${data?.tier || "新朋友"}`
                    : "未登入訪客預覽"}
                </span>
                <span className="rounded-full border border-[#d6c2a8] bg-[#fffaf2] px-3 py-1 text-xs font-bold text-[#7c5c3e]">
                  {userTierCode === "GOLD"
                    ? "點數商店享 85 折 · P1 尊榮客服"
                    : userTierCode === "SILVER"
                      ? "點數商店享 9 折 · P2 優先客服"
                      : "每滿 NT$10 累積 1 點 · 開戶贈 120 點"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-4">
                <div>
                  <span className="block text-xs font-bold text-[#7a6856]">
                    目前可用點數餘額
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 font-mono text-4xl font-bold text-[#935941] sm:text-5xl">
                    <span>{currentPoints}</span>
                    <span className="text-base font-bold text-[#5a4b3e]">
                      點
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl border border-[#cfe0d0] bg-[#f3f8f3] px-4 py-2.5">
                  <span className="block text-[11px] font-bold text-[#4e6752]">
                    結帳直接折抵現金價值（1 點 = NT$1）
                  </span>
                  <strong className="font-mono text-xl font-bold text-[#2f4b33]">
                    可現折 {money(currentPoints)}
                  </strong>
                </div>
              </div>
            </div>

            {!user && (
              <button
                type="button"
                onClick={() => openAuth(true)}
                className="btn-tactile inline-flex items-center gap-2 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white"
              >
                <LogIn size={14} />
                登入領取 120 點開戶禮
              </button>
            )}
          </div>

          {/* 累計消費與升等進度條 */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#5a4b3e]">
              <span>
                帳戶累計選物消費：{" "}
                <strong className="font-mono text-[#302b26]">
                  {money(data?.spentNt ?? 0)}
                </strong>
              </span>
              <span>
                {data?.nextTierNt
                  ? `再累積 ${money(Math.max(0, data.nextTierNt - (data?.spentNt ?? 0)))} 自動升等下一級`
                  : user
                    ? "已達最高等級「星光夥伴 VIP」"
                    : "滿 NT$3,000 升等暖心夥伴 · 滿 NT$12,000 升等星光夥伴 VIP"}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#ead] bg-[#ede2d3]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.7 }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#935941_0%,#c9964c_100%)]"
              />
            </div>
          </div>

          {/* 三級會員權益快覽 */}
          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            {TIER_POINTS_PERKS.map((perk) => {
              const isCurrent = userTierCode === perk.tier;
              return (
                <div
                  key={perk.tier}
                  className={`rounded-2xl border p-3 text-xs transition-all ${
                    isCurrent
                      ? "border-[#935941] bg-[#fdf5ea] shadow-2xs"
                      : "border-[#e5d7c6] bg-white/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-[#302b26]">{perk.name}</strong>
                    {isCurrent && (
                      <span className="rounded-full bg-[#935941] px-2 py-0.5 text-[10px] font-bold text-white">
                        目前等級
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-[#7c6a58]">
                    {perk.thresholdText}
                  </p>
                  <p className="mt-1.5 font-semibold text-[#935941]">
                    {perk.shopDiscountRate < 1
                      ? `點數商店 ${Math.round(perk.shopDiscountRate * 100)} 折換購`
                      : "10 元 1 點 · 1 點折 1 元"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右欄：互動式「每日節氣・八角木製福引搖獎機」 */}
        <div className="craft-letterpress flex flex-col justify-between rounded-[2rem] p-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fcf3dc] px-3 py-1 font-mono text-[11px] font-bold text-[#8a5812]">
                <Dices size={13} />
                DAILY FUKUBIKI · 每日福引搖獎機
              </span>
              <span className="font-mono text-xs font-bold text-[#935941]">
                每日免費搖出 +15～+60 點
              </span>
            </div>
            <h2 className="editorial-title mt-2.5 text-xl font-bold text-[#302b26]">
              搖動八角木輪，領取今日伴食點數
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#6b5d50]">
              抽中點數將即時匯入您的帳戶存摺，可立即用於點數商店換購或結帳折抵現金。
            </p>
          </div>

          {/* 八角福引搖獎機 SVG 與滾出彩球動畫 */}
          <div className="my-4 flex items-center justify-center gap-5 rounded-2xl border border-[#e3d3c0] bg-[#fffaf2] p-4">
            <motion.svg
              viewBox="0 0 130 130"
              className="size-28 shrink-0"
              animate={{ rotate: spinning ? 720 : 0 }}
              transition={{ duration: 0.65, ease: "easeInOut" }}
            >
              {/* 底座支架 */}
              <path
                d="M35 120L58 72H72L95 120"
                stroke="#6e472b"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <rect
                x="24"
                y="116"
                width="82"
                height="8"
                rx="4"
                fill="#8c5c38"
              />
              {/* 八角木鼓主體 */}
              <polygon
                points="46,16 84,16 110,42 110,78 84,104 46,104 20,78 20,42"
                fill="#d8a872"
                stroke="#7a4c2a"
                strokeWidth="3.5"
              />
              <polygon
                points="50,24 80,24 100,45 100,75 80,96 50,96 30,75 30,45"
                fill="#edd0a8"
                stroke="#9c6c44"
                strokeWidth="1.5"
              />
              {/* 中心黃銅搖柄 */}
              <circle
                cx="65"
                cy="60"
                r="12"
                fill="#c99b49"
                stroke="#6e472b"
                strokeWidth="2.5"
              />
              <line
                x1="65"
                y1="60"
                x2="92"
                y2="60"
                stroke="#6e472b"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="94" cy="60" r="6" fill="#935941" />
            </motion.svg>

            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                {drawResult ? (
                  <motion.div
                    key={drawResult.rank}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-xl border border-[#dfb86c] bg-[#fcf5e3] p-3 text-center"
                  >
                    <span className="inline-block rounded-full bg-[#8a5812] px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {drawResult.rank}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-bold text-[#935941]">
                      +{drawResult.points} 點
                    </p>
                    <p className="text-[11px] text-[#6b5226]">
                      已匯入您的點數存摺！
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-1.5 text-xs text-[#695b4e]">
                    <p className="font-bold text-[#302b26]">四種福引彩球賞別：</p>
                    <p>・特賞金箔球：+60 點（折 NT$60）</p>
                    <p>・壹賞赤陶球：+35 點（折 NT$35）</p>
                    <p>・貳賞翠玉球：+25 點（折 NT$25）</p>
                    <p>・參賞胡桃球：+15 點（折 NT$15）</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            type="button"
            disabled={spinning || Boolean(data?.dailyDrawClaimed)}
            onClick={handleDailyDraw}
            className="btn-tactile flex w-full items-center justify-center gap-2 bg-[#935941] py-3 text-xs font-bold text-white hover:bg-[#7d4934] disabled:opacity-50"
          >
            <Sparkles size={15} />
            {spinning
              ? "正在轉動八角福引機…"
              : data?.dailyDrawClaimed
                ? "今日已領取福引點數（明日 00:00 重置）"
                : user
                  ? "轉動木柄・搖出今日免費點數"
                  : "登入會員並搖出今日免費點數"}
          </button>
        </div>
      </div>

      {/* 剛完成的點數換購憑證通知卡 */}
      <AnimatePresence>
        {lastExchangeReceipt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#4e6752] bg-[#eef5ef] p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <WaxSealStamp text="換購核定" subtext="POINTS" size={58} />
              <div>
                <p className="text-xs font-bold text-[#38573d]">
                  點數商店換購成功（已扣除 {lastExchangeReceipt.pointsSpent} 點）
                </p>
                <p className="mt-0.5 text-sm font-bold text-[#233626]">
                  {lastExchangeReceipt.title}
                </p>
                <p className="mt-0.5 font-mono text-xs text-[#4e6752]">
                  專屬憑證／折抵代碼：<strong>{lastExchangeReceipt.code}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(lastExchangeReceipt.code);
                  toast.success("已複製憑證代碼");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4e6752] px-3.5 py-2 text-xs font-bold text-white"
              >
                <Copy size={13} />
                複製代碼
              </button>
              <Link
                href="/checkout"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#4e6752] bg-white px-3.5 py-2 text-xs font-bold text-[#38573d]"
              >
                前往結帳套用
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 六大功能導覽頁籤 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["bazaar", "點數商店市集", Gift],
            [
              "vault",
              `我的票券與憑證 (${(data?.redemptions.length ?? 0) + (data?.shopExchanges?.length ?? 0)})`,
              Ticket,
            ],
            ["simulator", "1點折1元試算儀", Calculator],
            ["badges", "任務集章領點", Award],
            ["history", "點數存摺明細", Coins],
            ["notices", "會員通知中心", Bell],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-bold transition-all ${
              view === id
                ? "border-[#935941] bg-[#935941] text-white shadow-[0_3px_0_#6e3f2c]"
                : "border-[#dfd0be] bg-white text-[#5e5043] hover:border-[#935941]"
            }`}
          >
            <Icon size={15} />
            <span className="truncate">{label}</span>
            {id === "notices" &&
            data?.notifications.some((entry) => !entry.readAt) ? (
              <span className="size-2 rounded-full bg-[#c85a48]" />
            ) : null}
          </button>
        ))}
      </div>

      {/* 分頁 1：點數商店市集（Points Craft Bazaar） */}
      {view === "bazaar" && (
        <div className="space-y-6">
          {/* 分類篩選、搜尋與可兌換過濾 */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5d6c3] bg-white p-4">
            <div className="flex flex-wrap gap-1.5">
              {POINTS_SHOP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setShopCategory(cat.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    shopCategory === cat.id
                      ? "bg-[#302b26] text-white"
                      : "border border-[#e2d4c3] bg-[#faf6f0] text-[#685a4d] hover:border-[#935941]"
                  }`}
                >
                  {cat.code !== "ALL" && (
                    <span className="mr-1 font-mono opacity-75">
                      {cat.code}·
                    </span>
                  )}
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#5a4b3e]">
                <input
                  type="checkbox"
                  checked={onlyAffordable}
                  onChange={(e) => setOnlyAffordable(e.target.checked)}
                  className="accent-[#935941]"
                />
                僅顯示目前點數可換 ({currentPoints} 點內)
              </label>

              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7a6a]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋試吃包、黃銅器物、禮券…"
                  className="input !mt-0 !min-h-9 !py-1.5 !pl-8 text-xs w-48 sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* 街坊浪浪公益助糧即時累積橫幅 */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#cfe0d0] bg-[#f3f8f4] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#4e6752] text-white">
                <HeartHandshake size={20} />
              </span>
              <div>
                <p className="text-xs font-bold text-[#2f4b33]">
                  台灣街坊浪浪溫飽計畫 · 會員點數雙倍配捐中
                </p>
                <p className="text-[11px] text-[#526e56]">
                  每以 40 點認捐 200g 原肉主糧，PURESPOT 即同步配捐 200g 至在地中途之家
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-[#4e6752]">
                本月全站會員累計助糧
              </span>
              <strong className="font-mono text-lg font-bold text-[#2a452e]">
                {(charityTotalGrams / 1000).toFixed(1)} 公斤（約{" "}
                {Math.round(charityTotalGrams / 150)} 餐）
              </strong>
            </div>
          </div>

          {/* 點數商品卡片網格 */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCatalog.map((item) => {
              const unlocked = canUnlockByTier(
                userTierCode === "GUEST" ? "MEMBER" : userTierCode,
                item.requiredTier,
              );
              const finalCost = discountedPointsCost(
                item.pointsCost,
                userTierCode,
              );
              const hasDiscount = finalCost < item.pointsCost;
              const affordable = currentPoints >= finalCost;
              const progressPct = Math.min(
                100,
                Math.round((currentPoints / finalCost) * 100),
              );
              const linkedProd = item.linkedProductId
                ? getProduct(item.linkedProductId)
                : null;

              return (
                <motion.article
                  key={item.id}
                  whileHover={{ y: -4 }}
                  className="polaroid-card flex flex-col justify-between rounded-[1.7rem] p-5"
                >
                  <div>
                    {/* 頂部編號與等級標籤 */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#935941]/12 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#935941]">
                        {item.code} · {item.tag}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          item.requiredTier === "GOLD"
                            ? "bg-[#fcf3dc] text-[#8a5812]"
                            : item.requiredTier === "SILVER"
                              ? "bg-[#eef4ef] text-[#3d5c43]"
                              : "bg-[#f4ece1] text-[#6e5d4f]"
                        }`}
                      >
                        {!unlocked && <Lock size={10} />}
                        {item.requiredTier === "GOLD"
                          ? "星光 VIP 專屬"
                          : item.requiredTier === "SILVER"
                            ? "暖心夥伴以上"
                            : "全等級開放"}
                      </span>
                    </div>

                    {/* 商品視覺區 */}
                    <div className="mt-3.5 flex items-center gap-3.5 rounded-2xl border border-[#ece0d1] bg-[#faf5ed] p-3">
                      <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-2xs">
                        {linkedProd ? (
                          <Image
                            src={linkedProd.image}
                            alt={item.title}
                            fill
                            sizes="80px"
                            className="object-contain p-1"
                          />
                        ) : item.category === "TASTER_PACK" ? (
                          <SampleSachetSvg variant="salmon" size={56} />
                        ) : item.category === "CASH_VOUCHER" ? (
                          <div className="flex flex-col items-center justify-center text-[#935941]">
                            <Ticket size={28} />
                            <span className="mt-0.5 font-mono text-[10px] font-bold">
                              NT${item.voucherDiscountNt}
                            </span>
                          </div>
                        ) : item.category === "CHARITY_MEAL" ? (
                          <div className="flex flex-col items-center justify-center text-[#4e6752]">
                            <HeartHandshake size={28} />
                            <span className="mt-0.5 font-mono text-[10px] font-bold">
                              200g×2
                            </span>
                          </div>
                        ) : (
                          <Package size={28} className="text-[#935941]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold leading-5 text-[#302b26]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-[#935941]">
                          {item.subtitle}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[#7c6d5e]">
                          市價價值 {money(item.retailValueNt)} · 庫存 {item.stock}{" "}
                          組
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-[#685a4d]">
                      {item.description}
                    </p>
                    <p className="mt-2 rounded-lg bg-[#f6efe6] px-2.5 py-1 font-mono text-[10px] text-[#7a6856]">
                      規格：{item.specNote}
                    </p>
                  </div>

                  {/* 底部點數門檻進度條與換購按鈕 */}
                  <div className="mt-4 border-t border-[#ece0d1] pt-3.5">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <strong className="font-mono text-2xl font-bold text-[#935941]">
                          {finalCost}
                        </strong>
                        <span className="text-xs font-bold text-[#5a4b3e]">
                          點
                        </span>
                        {hasDiscount && (
                          <span className="font-mono text-xs text-[#9c8d7e] line-through">
                            {item.pointsCost} 點
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-[#6b5d50]">
                        {affordable
                          ? "點數充足・可立即換購"
                          : `還差 ${finalCost - currentPoints} 點`}
                      </span>
                    </div>

                    {/* 點數充足度進度條 */}
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efe4d4]">
                      <div
                        style={{ width: `${progressPct}%` }}
                        className={`h-full rounded-full transition-all ${
                          affordable ? "bg-[#4e6752]" : "bg-[#c89652]"
                        }`}
                      />
                    </div>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      disabled={
                        busy === item.id || (Boolean(user) && (!unlocked || !affordable))
                      }
                      onClick={(e) => void handleExchangeItem(e, item)}
                      className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                        !user
                          ? "bg-[#935941] text-white hover:bg-[#7d4934]"
                          : !unlocked
                            ? "border border-[#d8cec2] bg-[#f4efe8] text-[#8a7c6e] cursor-not-allowed"
                            : affordable
                              ? "btn-tactile bg-[#935941] text-white hover:bg-[#7d4934]"
                              : "border border-[#dfd0be] bg-[#faf4eb] text-[#8a7562] cursor-not-allowed"
                      }`}
                    >
                      {busy === item.id ? (
                        "正在核發換購憑證…"
                      ) : !user ? (
                        <>
                          <LogIn size={13} />
                          登入會員即可換購
                        </>
                      ) : !unlocked ? (
                        <>
                          <Lock size={13} />
                          需升等至
                          {item.requiredTier === "GOLD"
                            ? "星光夥伴 VIP"
                            : "暖心夥伴"}
                        </>
                      ) : affordable ? (
                        <>
                          <Gift size={14} />
                          以 {finalCost} 點立即換購
                        </>
                      ) : (
                        `點數不足（尚差 ${finalCost - currentPoints} 點）`
                      )}
                    </motion.button>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {/* 資料庫自訂額外優惠券（若後台管理員在 /admin/membership 新增了自訂優惠） */}
          {Boolean(data?.rewards.length) && (
            <div className="rounded-2xl border border-[#e5d6c3] bg-[#fffaf2] p-5">
              <h3 className="text-sm font-bold text-[#302b26]">
                後台常設點數折抵券
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {data?.rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between rounded-xl border border-[#e2d3c1] bg-white p-3.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#302b26]">
                        {reward.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#7c6d5e]">
                        {reward.pointsCost} 點 · 折抵 {money(reward.discountNt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={
                        busy === reward.id || currentPoints < reward.pointsCost
                      }
                      onClick={() => void redeemLegacyReward(reward.id)}
                      className="rounded-xl bg-[#935941] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                    >
                      兌換
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 分頁 2：我的票券與換購憑證夾 */}
      {view === "vault" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e5d6c3] bg-white p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-[#302b26]">
              <Ticket size={18} className="text-[#935941]" />
              未使用的結帳折抵禮券（{data?.redemptions.length ?? 0} 張）
            </h3>
            <p className="mt-1 text-xs text-[#7c6d5e]">
              可於結帳頁下拉選單直接選用，並可與「1 點折 1 元現金折抵」同時併用！
            </p>
            {data?.redemptions.length ? (
              <div className="mt-4 space-y-2.5">
                {data.redemptions.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dfd0be] bg-[#faf5ed] p-3.5 text-sm"
                  >
                    <div>
                      <strong className="block text-xs font-bold text-[#302b26]">
                        {item.reward.title}
                      </strong>
                      <span className="text-[11px] text-[#4e6752] font-semibold">
                        結帳直接折抵 {money(item.discountNt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(item.code);
                          toast.success("優惠碼已複製");
                        }}
                        className="rounded-lg border border-[#d6c2a8] bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#935941]"
                      >
                        {item.code} · 複製
                      </button>
                      <Link
                        href="/checkout"
                        className="rounded-lg bg-[#935941] px-3 py-1.5 text-xs font-bold text-white"
                      >
                        去使用
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-[#faf6f0] p-6 text-center text-xs text-[#7c6d5e]">
                目前票券夾尚無未使用的折價禮券，可於「點數商店市集」換購放大禮券。
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[#e5d6c3] bg-white p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-[#302b26]">
              <Package size={18} className="text-[#4e6752]" />
              已換購的隨箱試吃包、工藝器物與公益助糧（
              {data?.shopExchanges?.length ?? 0} 筆）
            </h3>
            <p className="mt-1 text-xs text-[#7c6d5e]">
              實體換購品將隨您的下一筆訂單自動封箱免運寄出。
            </p>
            {data?.shopExchanges?.length ? (
              <div className="mt-4 space-y-2.5">
                {data.shopExchanges.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#d6e2d7] bg-[#f4f8f4] p-3.5 text-xs"
                  >
                    <div>
                      <strong className="block text-[#283c2b]">
                        {ex.title}
                      </strong>
                      <span className="mt-0.5 block text-[11px] text-[#5c705e]">
                        換購日期：
                        {new Date(ex.createdAt).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#4e6752] px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                      -{ex.pointsCost} 點
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-[#faf6f0] p-6 text-center text-xs text-[#7c6d5e]">
                尚無換購紀錄，快去點數商店挑選鮭魚凍乾試吃包或黃銅封口夾吧！
              </p>
            )}
          </div>
        </div>
      )}

      {/* 分頁 3：10元1點・1點折1元 回饋與放大價值試算儀 */}
      {view === "simulator" && (
        <div className="craft-letterpress rounded-[2rem] p-6 sm:p-8">
          <span className="font-mono text-xs font-bold tracking-wider text-[#935941]">
            POINTS VALUE SIMULATOR · 點數雙向折抵與放大價值試算儀
          </span>
          <h3 className="editorial-title mt-1.5 text-2xl font-bold text-[#302b26]">
            試算您的「消費 NT$10 累積 1 點」與「1 點折抵 NT$1」最佳用法
          </h3>

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 rounded-2xl border border-[#e3d3c0] bg-[#fffaf2] p-5">
              <div>
                <div className="flex justify-between text-xs font-bold text-[#302b26]">
                  <span>1. 預計單次或每月選物消費金額</span>
                  <span className="font-mono text-base text-[#935941]">
                    {money(simSpendNt)}
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={12000}
                  step={100}
                  value={simSpendNt}
                  onChange={(e) => setSimSpendNt(Number(e.target.value))}
                  className="mt-2.5 h-2 w-full cursor-pointer accent-[#935941]"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-[#8a7a6a]">
                  <span>NT$300 單品體驗</span>
                  <span>NT$3,000 升暖心夥伴</span>
                  <span>NT$12,000 升星光 VIP</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#302b26]">
                  <span>2. 結帳準備使用的折抵點數</span>
                  <span className="font-mono text-base text-[#4e6752]">
                    {simRedeemPts} 點（折抵 {money(simRedeemPts)}）
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={10}
                  value={simRedeemPts}
                  onChange={(e) => setSimRedeemPts(Number(e.target.value))}
                  className="mt-2.5 h-2 w-full cursor-pointer accent-[#4e6752]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#dfd0be] bg-white p-4">
                <span className="text-xs font-bold text-[#7c6a58]">
                  本單結帳現折後實付金額
                </span>
                <p className="mt-2 font-mono text-3xl font-bold text-[#302b26]">
                  {money(Math.max(0, simSpendNt - simRedeemPts))}
                </p>
                <span className="mt-1 block text-[11px] text-[#4e6752] font-semibold">
                  已透過 {simRedeemPts} 點直接折抵現金 {money(simRedeemPts)}
                </span>
              </div>

              <div className="rounded-2xl border border-[#dfd0be] bg-white p-4">
                <span className="text-xs font-bold text-[#7c6a58]">
                  本單完成後新獲點數（10元1點）
                </span>
                <p className="mt-2 font-mono text-3xl font-bold text-[#935941]">
                  +{Math.floor(Math.max(0, simSpendNt - simRedeemPts) / 10)} 點
                </p>
                <span className="mt-1 block text-[11px] text-[#7c6a58]">
                  可於下次結帳再折{" "}
                  {money(
                    Math.floor(Math.max(0, simSpendNt - simRedeemPts) / 10),
                  )}
                </span>
              </div>

              <div className="col-span-2 rounded-2xl border border-[#cfe0d0] bg-[#f3f8f4] p-4 text-xs leading-5 text-[#2e4932]">
                <strong>職人點數放大秘訣：</strong>若將 {simRedeemPts}{" "}
                點拿到「點數商店市集」換購隨箱試吃包或放大禮券，最高可換得相當於{" "}
                <strong className="font-mono text-sm">
                  {money(Math.round(simRedeemPts * 2.1))}
                </strong>{" "}
                的實體鮮食與器物價值！
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分頁 4：任務集章領點 */}
      {view === "badges" && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {data?.badges.map((badge) => (
            <div
              key={badge.title}
              className={`flex items-center gap-4 rounded-2xl border p-5 ${
                badge.earned
                  ? "border-[#b8ceb9] bg-[#f2f8f3]"
                  : "border-[#e5d6c3] bg-white"
              }`}
            >
              <span
                className={`grid size-12 place-items-center rounded-2xl ${
                  badge.earned
                    ? "bg-[#4e6752] text-white"
                    : "bg-[#f4ece1] text-[#935941]"
                }`}
              >
                <Award size={24} />
              </span>
              <div className="flex-1">
                <h3 className="font-bold text-[#302b26]">{badge.title}</h3>
                <p className="mt-0.5 text-xs text-[#6b5d50]">
                  {badge.earned
                    ? `已完成任務並領取 +${badge.points} 點`
                    : `${badge.missionTitle} · 完成可獲 +${badge.points} 點（等值 NT$${badge.points}）`}
                </p>
              </div>
              {badge.earned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#4e6752] px-2.5 py-1 text-[11px] font-bold text-white">
                  <Check size={13} />
                  已領點
                </span>
              ) : (
                <span className="font-mono text-xs font-bold text-[#935941]">
                  +{badge.points} 點
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 分頁 5：點數存摺明細 */}
      {view === "history" && (
        <div className="rounded-2xl border border-[#e5d6c3] bg-white p-6">
          <div className="flex items-center justify-between border-b border-[#efe4d6] pb-3">
            <h3 className="font-bold text-[#302b26]">
              點數存摺收支明細（10 元累積 1 點 · 1 點折抵 1 元）
            </h3>
            <span className="font-mono text-xs font-bold text-[#935941]">
              目前結餘：{currentPoints} 點
            </span>
          </div>
          {data?.entries.length ? (
            <div className="divide-y divide-[#f2e8dc]">
              {data.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 py-3.5 text-sm"
                >
                  <div>
                    <span className="font-medium text-[#302b26]">
                      {entry.title}
                    </span>
                    <small className="ml-2 font-mono text-xs text-[#8a7a6a]">
                      {new Date(entry.createdAt).toLocaleDateString("zh-TW")}
                    </small>
                  </div>
                  <strong
                    className={`font-mono ${
                      entry.points >= 0 ? "text-[#4e6752]" : "text-[#935941]"
                    }`}
                  >
                    {entry.points >= 0 ? "+" : ""}
                    {entry.points} 點
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#7c6d5e]">
              登入並完成福引搖獎或選物後，每一筆點數紀錄都會清楚列在這裡。
            </p>
          )}
        </div>
      )}

      {/* 分頁 6：會員通知中心 */}
      {view === "notices" && (
        <div className="space-y-2.5">
          {data?.notifications.length ? (
            data.notifications.map((notice) => (
              <article
                key={notice.id}
                className={`rounded-2xl border p-4 ${
                  notice.readAt
                    ? "border-[#e5d6c3] bg-white"
                    : "border-[#935941] bg-[#fdf5ea]"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <strong className="text-sm text-[#302b26]">
                    {notice.title}
                  </strong>
                  <button
                    type="button"
                    onClick={() => void markRead(notice.id)}
                    disabled={Boolean(notice.readAt)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#935941] disabled:opacity-40"
                  >
                    <CheckCircle2 size={13} />
                    {notice.readAt ? "已讀" : "標為已讀"}
                  </button>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#685a4d]">
                  {notice.body}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-[#e5d6c3] bg-white p-6 text-sm text-[#7c6d5e]">
              目前沒有新通知。
            </p>
          )}
        </div>
      )}
    </section>
  );
}
