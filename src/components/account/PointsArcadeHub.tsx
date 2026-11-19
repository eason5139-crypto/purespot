"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Dices,
  Gift,
  LogIn,
  RotateCw,
  Sparkles,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_ARCADE_CONFIG,
  WHEEL_KEYS,
  type PointsArcadeConfig,
  type ScratchPrize,
  type WheelKey,
  type WheelPrize,
} from "@/lib/pointsArcadeConfig";
import { accountJson, jsonRequest } from "@/lib/accountTypes";
import { triggerPawBurst } from "@/lib/flyToCart";

export type CheckInStatus = {
  claimedToday: boolean;
  streakDays: number;
  cycleDay: number;
  dailyPoints: number;
  streak7Bonus: number;
};

export type ArcadeLimits = {
  fukubikiUsedToday: number;
  fukubikiDailyLimit: number;
  scratchUsedToday: number;
  scratchDailyLimit: number;
};

export type ArcadeTaskStatus = {
  key: string;
  scope: "DAILY" | "MILESTONE";
  title: string;
  description: string;
  points: number;
  href: string;
  completed: boolean;
  claimed: boolean;
};

interface PointsArcadeHubProps {
  isLoggedIn: boolean;
  points: number;
  arcadeConfig: PointsArcadeConfig;
  checkInStatus: CheckInStatus;
  arcadeLimits: ArcadeLimits;
  arcadeTasks: ArcadeTaskStatus[];
  onRequireAuth: () => void;
  onRefresh: () => Promise<void>;
}

const WHEEL_TAB_LABEL: Record<WheelKey, string> = {
  CAT: "貓咪轉盤",
  DOG: "狗狗轉盤",
  SMALL_PET: "小寵轉盤",
};

const BALL_STYLE: Record<
  string,
  { fill: string; border: string; text: string }
> = {
  GOLD: { fill: "#d8a848", border: "#9a701e", text: "#422b04" },
  CLAY: { fill: "#935941", border: "#663926", text: "#ffffff" },
  JADE: { fill: "#4e6752", border: "#324735", text: "#ffffff" },
  WOOD: { fill: "#a98360", border: "#76573b", text: "#ffffff" },
  SAND: { fill: "#cbb79e", border: "#988269", text: "#3d3228" },
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function wedgePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

/** 互動式 Canvas 金箔刮刮卡 */
function InteractiveScratchCard({
  prize,
  code,
  onRevealed,
}: {
  prize: ScratchPrize;
  code: string | null;
  onRevealed: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const strokesRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 繪製質感香檳金塗層
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#d7b988");
    grad.addColorStop(0.5, "#e6cfa4");
    grad.addColorStop(1, "#c4a067");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 斜紋與提示字
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    for (let i = -canvas.height; i < canvas.width + canvas.height; i += 18) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvas.height, canvas.height);
      ctx.stroke();
    }
    ctx.fillStyle = "#6c4e24";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("按住滑動刮開金箔塗層", canvas.width / 2, canvas.height / 2 + 6);
    setRevealed(false);
    strokesRef.current = 0;
  }, [prize.id, code]);

  function scratchAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    strokesRef.current += 1;
    if (strokesRef.current % 6 === 0) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0;
      const totalPixels = canvas.width * canvas.height;
      for (let i = 3; i < imgData.length; i += 16) {
        if (imgData[i]! < 128) cleared++;
      }
      const ratio = cleared / (totalPixels / 4);
      if (ratio >= 0.42) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setRevealed(true);
        onRevealed();
      }
    }
  }

  function revealAll() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!revealed) {
      setRevealed(true);
      onRevealed();
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="relative mx-auto h-40 w-full max-w-[340px] overflow-hidden rounded-2xl border-2 border-[#d4b687] bg-[#fffaf1] shadow-inner">
        {/* 底層揭曉獎項 */}
        <div className="flex h-full flex-col items-center justify-center px-5 text-center">
          <span className="rounded-full bg-[#fdf2e3] px-2.5 py-0.5 text-[11px] font-bold text-[#935941]">
            {prize.kind === "POINTS" ? "點數回饋" : "結帳折抵券"}
          </span>
          <p className="mt-2 text-lg font-bold text-[#302b26]">{prize.label}</p>
          {code ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#e5d8c8] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#935941]">
              <span>{code}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(code);
                  toast.success("已複製折抵代碼");
                }}
                className="text-[#6e6257] hover:text-[#935941]"
              >
                <Copy size={12} />
              </button>
            </div>
          ) : (
            <p className="mt-1 font-mono text-xs font-bold text-[#4e6752]">
              已直接匯入帳戶點數
            </p>
          )}
        </div>

        {/* 頂層可刮除金箔畫布 */}
        {!revealed && (
          <canvas
            ref={canvasRef}
            width={340}
            height={160}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsScratching(true);
              scratchAt(e);
            }}
            onPointerMove={(e) => {
              if (isScratching) scratchAt(e);
            }}
            onPointerUp={() => setIsScratching(false)}
            onPointerCancel={() => setIsScratching(false)}
            className="absolute inset-0 size-full cursor-crosshair touch-none"
          />
        )}
      </div>

      {!revealed && (
        <div className="text-center">
          <button
            type="button"
            onClick={revealAll}
            className="text-xs font-bold text-[#935941] hover:underline"
          >
            快速全部刮開
          </button>
        </div>
      )}
    </div>
  );
}

export function PointsArcadeHub({
  isLoggedIn,
  points,
  arcadeConfig = DEFAULT_ARCADE_CONFIG,
  checkInStatus,
  arcadeLimits,
  arcadeTasks,
  onRequireAuth,
  onRefresh,
}: PointsArcadeHubProps) {
  const [activeGame, setActiveGame] = useState<"wheel" | "fukubiki" | "scratch">(
    "wheel",
  );
  const [wheelKey, setWheelKey] = useState<WheelKey>("CAT");
  const [busy, setBusy] = useState("");

  // 轉盤動畫狀態
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelOutcome, setWheelOutcome] = useState<{
    wheelTitle: string;
    prize: WheelPrize;
    code: string | null;
    costPoints: number;
  } | null>(null);

  // 福引搖獎機狀態
  const [fukubikiSpinning, setFukubikiSpinning] = useState(false);
  const [fukubikiOutcome, setFukubikiOutcome] = useState<{
    ball: string;
    rank: string;
    pointsWon: number;
    costPoints: number;
    netPoints: number;
  } | null>(null);

  // 刮刮樂狀態
  const [scratchCard, setScratchCard] = useState<{
    prize: ScratchPrize;
    code: string | null;
    costPoints: number;
    revealed: boolean;
  } | null>(null);

  const currentWheel = arcadeConfig.wheels[wheelKey];
  const wheelTotalWeight = useMemo(
    () =>
      currentWheel.prizes.reduce((s, p) => s + Math.max(1, p.weight), 0),
    [currentWheel.prizes],
  );
  const fukubikiTotalWeight = useMemo(
    () =>
      arcadeConfig.fukubiki.prizes.reduce(
        (s, p) => s + Math.max(1, p.weight),
        0,
      ),
    [arcadeConfig.fukubiki.prizes],
  );

  const dailyTasks = arcadeTasks.filter((t) => t.scope === "DAILY");
  const milestoneTasks = arcadeTasks.filter((t) => t.scope === "MILESTONE");
  const claimableCount = arcadeTasks.filter(
    (t) => t.completed && !t.claimed,
  ).length;

  async function handleCheckIn(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    triggerPawBurst(e.currentTarget);
    setBusy("checkin");
    try {
      const res = await accountJson<{
        checkIn: {
          basePoints: number;
          bonusPoints: number;
          totalPoints: number;
          streakDays: number;
          isStreak7: boolean;
        };
      }>("/api/account/membership", jsonRequest("POST", { action: "check_in" }));
      await onRefresh();
      toast.success(
        res.checkIn.isStreak7
          ? `連續簽到第 ${res.checkIn.streakDays} 天！獲得 +${res.checkIn.basePoints} 點＋7 天加碼 +${res.checkIn.bonusPoints} 點`
          : `簽到成功！獲得 +${res.checkIn.basePoints} 點（已連續 ${res.checkIn.streakDays} 天）`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "簽到失敗");
    } finally {
      setBusy("");
    }
  }

  async function handleSpinWheel(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    if (wheelSpinning) return;
    if (points < currentWheel.costPoints) {
      toast.error(
        `點數不足，目前 ${points} 點（需要 ${currentWheel.costPoints} 點）`,
      );
      return;
    }

    setWheelSpinning(true);
    setWheelOutcome(null);
    triggerPawBurst(e.currentTarget);

    try {
      const res = await accountJson<{
        result: {
          wheelTitle: string;
          prizeIndex: number;
          prize: WheelPrize;
          code: string | null;
          costPoints: number;
        };
      }>(
        "/api/account/membership",
        jsonRequest("POST", {
          action: "play_wheel",
          wheelKey,
        }),
      );

      const count = currentWheel.prizes.length;
      const sliceDeg = 360 / count;
      // 扇形 center = prizeIndex * sliceDeg + sliceDeg / 2，要轉到頂部 0 度
      const targetCenter = res.result.prizeIndex * sliceDeg + sliceDeg / 2;
      const desiredMod = (360 - targetCenter + 360) % 360;
      const currentMod = ((wheelRotation % 360) + 360) % 360;
      const delta = (desiredMod - currentMod + 360) % 360;
      const extraSpins = 5 * 360;
      const nextAngle = wheelRotation + extraSpins + delta;

      setWheelRotation(nextAngle);

      window.setTimeout(async () => {
        setWheelSpinning(false);
        setWheelOutcome({
          wheelTitle: res.result.wheelTitle,
          prize: res.result.prize,
          code: res.result.code,
          costPoints: res.result.costPoints,
        });
        await onRefresh();
        toast.success(
          res.result.code
            ? `恭喜抽中「${res.result.prize.label}」！兌換碼已存入票券夾`
            : `恭喜獲得 ${res.result.prize.label}！`,
        );
      }, 4250);
    } catch (err) {
      setWheelSpinning(false);
      toast.error(err instanceof Error ? err.message : "轉盤抽獎失敗");
    }
  }

  async function handlePlayFukubiki(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    if (fukubikiSpinning) return;
    if (points < arcadeConfig.fukubiki.costPoints) {
      toast.error(
        `點數不足，需要 ${arcadeConfig.fukubiki.costPoints} 點`,
      );
      return;
    }
    setFukubikiSpinning(true);
    setFukubikiOutcome(null);
    triggerPawBurst(e.currentTarget);

    try {
      const res = await accountJson<{
        result: {
          ball: string;
          rank: string;
          pointsWon: number;
          costPoints: number;
          netPoints: number;
        };
      }>("/api/account/membership", jsonRequest("POST", { action: "play_fukubiki" }));

      window.setTimeout(async () => {
        setFukubikiSpinning(false);
        setFukubikiOutcome(res.result);
        await onRefresh();
        toast.success(
          `搖出 ${res.result.rank}！獲得 +${res.result.pointsWon} 點`,
        );
      }, 1150);
    } catch (err) {
      setFukubikiSpinning(false);
      toast.error(err instanceof Error ? err.message : "搖獎失敗");
    }
  }

  async function handleBuyScratchCard(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    if (points < arcadeConfig.scratch.costPoints) {
      toast.error(`點數不足，需要 ${arcadeConfig.scratch.costPoints} 點`);
      return;
    }
    setBusy("scratch");
    triggerPawBurst(e.currentTarget);
    try {
      const res = await accountJson<{
        result: {
          prize: ScratchPrize;
          code: string | null;
          costPoints: number;
        };
      }>("/api/account/membership", jsonRequest("POST", { action: "play_scratch" }));
      setScratchCard({
        prize: res.result.prize,
        code: res.result.code,
        costPoints: res.result.costPoints,
        revealed: false,
      });
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "開卡失敗");
    } finally {
      setBusy("");
    }
  }

  async function handleClaimTask(
    task: ArcadeTaskStatus,
    e: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    triggerPawBurst(e.currentTarget);
    setBusy(`task:${task.key}`);
    try {
      await accountJson(
        "/api/account/membership",
        jsonRequest("POST", {
          action: "claim_task",
          taskKey: task.key,
        }),
      );
      await onRefresh();
      toast.success(`已領取「${task.title}」獎勵 +${task.points} 點`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "領取失敗");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. 每日登入簽到（固定 +10 點，連簽 7 天額外 +30 點） */}
      <section className="rounded-3xl border border-[#e5d8c8] bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[#fdf3ec] text-[#935941]">
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#302b26]">
                每日登入簽到
              </h3>
              <p className="text-xs text-[#6e6257]">
                每日簽到固定領{" "}
                <strong className="font-mono text-[#935941]">
                  +{checkInStatus.dailyPoints} 點
                </strong>
                ，連續第 7 天加碼{" "}
                <strong className="font-mono text-[#4e6752]">
                  +{checkInStatus.streak7Bonus} 點
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={busy === "checkin" || checkInStatus.claimedToday}
            onClick={handleCheckIn}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-all ${
              checkInStatus.claimedToday
                ? "bg-[#eef5ef] text-[#3d5c43]"
                : "bg-[#935941] text-white shadow-xs hover:bg-[#7d4934] disabled:opacity-50"
            }`}
          >
            {checkInStatus.claimedToday ? (
              <>
                <CheckCircle2 size={15} />
                今日已簽到（連續 {checkInStatus.streakDays} 天）
              </>
            ) : !isLoggedIn ? (
              <>
                <LogIn size={15} />
                登入領取 +{checkInStatus.dailyPoints} 點
              </>
            ) : busy === "checkin" ? (
              "簽到入帳中…"
            ) : (
              <>
                <Coins size={15} />
                立即簽到 +{checkInStatus.dailyPoints} 點
              </>
            )}
          </button>
        </div>

        {/* 7 日連簽進度格 */}
        <div className="mt-4 grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const done = day <= checkInStatus.cycleDay;
            const isNext =
              !checkInStatus.claimedToday &&
              day === (checkInStatus.cycleDay % 7) + 1;
            const isDay7 = day === 7;
            return (
              <motion.div
                key={day}
                whileHover={{ y: -2 }}
                className={`flex flex-col items-center justify-center rounded-2xl border px-1.5 py-2.5 text-center transition-colors ${
                  done
                    ? "border-[#bcd0bf] bg-[#eef5ef]"
                    : isNext
                      ? "border-[#935941] bg-[#fdf5ec]"
                      : isDay7
                        ? "border-[#e2c896] bg-[#fcf6e8]"
                        : "border-[#ede2d5] bg-[#faf6f0]"
                }`}
              >
                <span className="font-mono text-[10px] font-bold text-[#7a6d60]">
                  Day {day}
                </span>
                <div className="my-1 flex size-7 items-center justify-center rounded-full">
                  {done ? (
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#4e6752] text-white">
                      <Check size={14} />
                    </span>
                  ) : isDay7 ? (
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#b8823c] text-white">
                      <Gift size={14} />
                    </span>
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-full bg-white font-mono text-[11px] font-bold text-[#935941] border border-[#e5d8c8]">
                      +{checkInStatus.dailyPoints}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] font-bold text-[#52473d]">
                  {isDay7
                    ? `+${checkInStatus.dailyPoints + checkInStatus.streak7Bonus}`
                    : `+${checkInStatus.dailyPoints} 點`}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 2. 點數遊樂中心（三款互動遊戲切換） */}
      <section className="rounded-3xl border border-[#e5d8c8] bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6da] pb-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-[#302b26]">點數遊樂場</h3>
            {isLoggedIn && (
              <span className="rounded-full bg-[#faf6f0] px-3 py-1 font-mono text-xs font-bold text-[#935941]">
                目前可用：{points.toLocaleString()} 點
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#e5d8c8] bg-[#faf6f0] p-1">
            {(
              [
                ["wheel", "寵物分類轉盤", RotateCw],
                ["fukubiki", "點數搖獎機", Dices],
                ["scratch", "每日刮刮樂", Ticket],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveGame(id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeGame === id
                    ? "bg-[#302b26] text-white shadow-2xs"
                    : "text-[#675b4f] hover:text-[#302b26]"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── 遊戲一：寵物分類轉盤（貓 / 狗 / 小寵） ─── */}
          {activeGame === "wheel" && (
            <motion.div
              key="wheel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-5 space-y-5"
            >
              {/* 貓 / 狗 / 小寵 分類切換 */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {WHEEL_KEYS.map((key) => {
                    const w = arcadeConfig.wheels[key];
                    const active = wheelKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={wheelSpinning}
                        onClick={() => {
                          setWheelKey(key);
                          setWheelOutcome(null);
                        }}
                        className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                          active
                            ? "border-[#935941] bg-[#fdf3ec] text-[#935941]"
                            : "border-[#e5d8c8] bg-[#faf6f0] text-[#675b4f] hover:border-[#c8b6a2]"
                        }`}
                      >
                        {w.title || WHEEL_TAB_LABEL[key]}
                        <span className="ml-1.5 font-mono text-[11px] opacity-80">
                          {w.costPoints} 點/抽
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-[#7a6d60]">
                  抽中商品兌換券自動存入票券夾，結帳直接折抵
                </span>
              </div>

              <div className="grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                {/* 左：互動 SVG 幸運轉盤 */}
                <div className="flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    {/* 頂部立體指針 */}
                    <div className="pointer-events-none absolute -top-2.5 z-20 flex flex-col items-center">
                      <svg
                        width="32"
                        height="36"
                        viewBox="0 0 32 36"
                        aria-hidden="true"
                      >
                        <path
                          d="M16 35 L4 10 A12 12 0 1 1 28 10 Z"
                          fill="#935941"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                        <circle cx="16" cy="12" r="4" fill="#fff4e6" />
                      </svg>
                    </div>

                    {/* 外框木紋輪盤與內部旋轉扇形 */}
                    <div className="relative size-[300px] rounded-full border-[10px] border-[#4b382a] bg-[#faf3e8] p-1 shadow-[0_18px_40px_-18px_rgba(70,40,20,0.45)] sm:size-[340px]">
                      <motion.div
                        animate={{ rotate: wheelRotation }}
                        transition={{
                          duration: 4.2,
                          ease: [0.14, 0.86, 0.18, 1],
                        }}
                        className="size-full"
                      >
                        <svg viewBox="0 0 320 320" className="size-full">
                          {currentWheel.prizes.map((prize, idx) => {
                            const count = currentWheel.prizes.length;
                            const step = 360 / count;
                            const start = idx * step;
                            const end = start + step;
                            const mid = start + step / 2;
                            const labelPos = polarToCartesian(
                              160,
                              160,
                              108,
                              mid,
                            );
                            const isLight =
                              prize.color.toLowerCase() === "#c4a889" ||
                              prize.color.toLowerCase() === "#cbb79e";

                            return (
                              <g key={prize.id}>
                                <path
                                  d={wedgePath(160, 160, 156, start, end)}
                                  fill={prize.color}
                                  stroke="#fffaf2"
                                  strokeWidth="2"
                                />
                                <g
                                  transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${mid})`}
                                >
                                  <text
                                    x="0"
                                    y="0"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={isLight ? "#302b26" : "#ffffff"}
                                    fontSize="11.5"
                                    fontWeight="800"
                                  >
                                    {prize.shortLabel}
                                  </text>
                                </g>
                              </g>
                            );
                          })}
                          {/* 外緣裝飾銅釘 */}
                          {Array.from({ length: 16 }).map((_, idx) => {
                            const pt = polarToCartesian(
                              160,
                              160,
                              150,
                              idx * 22.5,
                            );
                            return (
                              <circle
                                key={idx}
                                cx={pt.x}
                                cy={pt.y}
                                r="3"
                                fill={idx % 2 === 0 ? "#f7e0b2" : "#fffaf2"}
                              />
                            );
                          })}
                        </svg>
                      </motion.div>

                      {/* 中心旋轉啟動按鈕 */}
                      <button
                        type="button"
                        disabled={wheelSpinning}
                        onClick={handleSpinWheel}
                        className="absolute left-1/2 top-1/2 z-10 flex size-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-[#fff6ea] bg-[#302b26] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
                      >
                        <span className="text-xs font-black tracking-wide">
                          {wheelSpinning ? "旋轉中" : "立即抽"}
                        </span>
                        <span className="mt-0.5 font-mono text-[10px] text-[#f3cfa0]">
                          -{currentWheel.costPoints} 點
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 右：獎池公開明細與中獎憑證 */}
                <div className="space-y-4">
                  {wheelOutcome && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border-2 border-[#935941] bg-[#fdf5ec] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#935941]">
                          {wheelOutcome.wheelTitle}中獎結果
                        </span>
                        <span className="font-mono text-[11px] text-[#7a6d60]">
                          投入 {wheelOutcome.costPoints} 點
                        </span>
                      </div>
                      <p className="mt-1.5 text-base font-bold text-[#302b26]">
                        {wheelOutcome.prize.label}
                      </p>
                      {wheelOutcome.code ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg border border-[#dfb89a] bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#935941]">
                            {wheelOutcome.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                wheelOutcome.code!,
                              );
                              toast.success("已複製兌換碼");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#dfd0be] bg-white px-2.5 py-1.5 text-xs font-bold text-[#5e4d3f] hover:border-[#935941]"
                          >
                            <Copy size={12} />
                            複製
                          </button>
                          <Link
                            href="/checkout"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#935941] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#7d4934]"
                          >
                            前往結帳折抵
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs font-semibold text-[#4e6752]">
                          已即時匯入帳戶點數存摺
                        </p>
                      )}
                    </motion.div>
                  )}

                  <div className="rounded-2xl border border-[#ece1d4] bg-[#faf6f0] p-4">
                    <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-[#5e5246]">
                      <span>{currentWheel.title}獎池與機率</span>
                      <span className="font-mono text-[11px] text-[#8a7c6e]">
                        共 {currentWheel.prizes.length} 格
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {currentWheel.prizes.map((p) => {
                        const prob = (p.weight / wheelTotalWeight) * 100;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="truncate font-semibold text-[#302b26]">
                                {p.label}
                              </span>
                            </div>
                            <span className="ml-2 shrink-0 font-mono text-[11px] font-bold text-[#7a6d60]">
                              {prob.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── 遊戲二：福引倍率搖獎機（點數抽點數） ─── */}
          {activeGame === "fukubiki" && (
            <motion.div
              key="fukubiki"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-5 grid items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]"
            >
              <div className="flex flex-col items-center rounded-2xl border border-[#ece1d4] bg-[#faf6f0] p-6 text-center">
                <motion.div
                  animate={
                    fukubikiSpinning
                      ? { rotate: [0, 360, 720, 1080] }
                      : { rotate: 0 }
                  }
                  transition={{ duration: 1.1, ease: "easeInOut" }}
                  className="mb-4"
                >
                  <svg width="116" height="116" viewBox="0 0 120 120">
                    <polygon
                      points="42,14 78,14 106,42 106,78 78,106 42,106 14,78 14,42"
                      fill="#e7d2b5"
                      stroke="#6d4c32"
                      strokeWidth="5"
                    />
                    <polygon
                      points="46,24 74,24 96,46 96,74 74,96 46,96 24,74 24,46"
                      fill="#f8efe2"
                      stroke="#b89872"
                      strokeWidth="2"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="14"
                      fill="#c9964f"
                      stroke="#6d4c32"
                      strokeWidth="3"
                    />
                    <line
                      x1="60"
                      y1="60"
                      x2="88"
                      y2="60"
                      stroke="#6d4c32"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <circle cx="90" cy="60" r="6" fill="#935941" />
                  </svg>
                </motion.div>

                <p className="text-sm font-bold text-[#302b26]">
                  投入{" "}
                  <span className="font-mono text-[#935941]">
                    {arcadeConfig.fukubiki.costPoints} 點
                  </span>{" "}
                  博高倍點數
                </p>
                <p className="mt-1 font-mono text-xs text-[#7a6d60]">
                  今日已搖 {arcadeLimits.fukubikiUsedToday} /{" "}
                  {arcadeLimits.fukubikiDailyLimit} 次
                </p>

                <button
                  type="button"
                  disabled={
                    fukubikiSpinning ||
                    arcadeLimits.fukubikiUsedToday >=
                      arcadeLimits.fukubikiDailyLimit
                  }
                  onClick={handlePlayFukubiki}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#935941] px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#7d4934] disabled:opacity-45"
                >
                  <Sparkles size={15} />
                  {fukubikiSpinning
                    ? "搖出彩球中…"
                    : `花 ${arcadeConfig.fukubiki.costPoints} 點搖獎`}
                </button>

                {fukubikiOutcome && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 w-full rounded-xl border border-[#dfb89a] bg-white p-3.5"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="size-4 rounded-full border"
                        style={{
                          backgroundColor:
                            BALL_STYLE[fukubikiOutcome.ball]?.fill ?? "#935941",
                          borderColor:
                            BALL_STYLE[fukubikiOutcome.ball]?.border ??
                            "#663926",
                        }}
                      />
                      <strong className="text-sm text-[#302b26]">
                        {fukubikiOutcome.rank}
                      </strong>
                    </div>
                    <p className="mt-1 font-mono text-base font-black text-[#4e6752]">
                      獲得 +{fukubikiOutcome.pointsWon} 點
                      <span className="ml-2 text-xs font-bold text-[#7a6d60]">
                        （淨{fukubikiOutcome.netPoints >= 0 ? "+" : ""}
                        {fukubikiOutcome.netPoints} 點）
                      </span>
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-[#ece1d4] bg-[#faf6f0] p-4">
                <p className="text-xs font-bold text-[#5e5246]">
                  彩球獎項與公開機率
                </p>
                {arcadeConfig.fukubiki.prizes.map((p) => {
                  const st = BALL_STYLE[p.ball] ?? BALL_STYLE.CLAY!;
                  const prob = (p.weight / fukubikiTotalWeight) * 100;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="size-4 rounded-full border"
                          style={{
                            backgroundColor: st.fill,
                            borderColor: st.border,
                          }}
                        />
                        <span className="font-bold text-[#302b26]">
                          {p.rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <strong className="text-[#935941]">
                          +{p.points} 點
                        </strong>
                        <span className="w-12 text-right text-[11px] text-[#7a6d60]">
                          {prob.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── 遊戲三：每日點數刮刮樂 ─── */}
          {activeGame === "scratch" && (
            <motion.div
              key="scratch"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-5 grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]"
            >
              <div className="rounded-2xl border border-[#ece1d4] bg-[#faf6f0] p-6 text-center">
                {scratchCard ? (
                  <div className="space-y-4">
                    <InteractiveScratchCard
                      prize={scratchCard.prize}
                      code={scratchCard.code}
                      onRevealed={() => {
                        setScratchCard((prev) =>
                          prev ? { ...prev, revealed: true } : null,
                        );
                        toast.success(`刮出「${scratchCard.prize.label}」！`);
                      }}
                    />
                    {scratchCard.revealed && (
                      <button
                        type="button"
                        disabled={
                          busy === "scratch" ||
                          arcadeLimits.scratchUsedToday >=
                            arcadeLimits.scratchDailyLimit
                        }
                        onClick={handleBuyScratchCard}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#935941] px-5 text-xs font-bold text-white hover:bg-[#7d4934] disabled:opacity-45"
                      >
                        再刮一張（-{arcadeConfig.scratch.costPoints} 點）
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-5">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#fcf2df] text-[#b8823c]">
                      <Ticket size={28} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#302b26]">
                      投入{" "}
                      <span className="font-mono text-[#935941]">
                        {arcadeConfig.scratch.costPoints} 點
                      </span>{" "}
                      開啟一張金箔刮刮卡
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#7a6d60]">
                      今日已刮 {arcadeLimits.scratchUsedToday} /{" "}
                      {arcadeLimits.scratchDailyLimit} 張
                    </p>
                    <button
                      type="button"
                      disabled={
                        busy === "scratch" ||
                        arcadeLimits.scratchUsedToday >=
                          arcadeLimits.scratchDailyLimit
                      }
                      onClick={handleBuyScratchCard}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#935941] px-6 text-xs font-bold text-white shadow-xs hover:bg-[#7d4934] disabled:opacity-45"
                    >
                      {busy === "scratch"
                        ? "準備刮刮卡中…"
                        : `花 ${arcadeConfig.scratch.costPoints} 點開卡刮獎`}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-[#ece1d4] bg-[#faf6f0] p-4">
                <p className="text-xs font-bold text-[#5e5246]">刮刮樂獎池</p>
                {arcadeConfig.scratch.prizes.map((p) => {
                  const totalW = arcadeConfig.scratch.prizes.reduce(
                    (s, i) => s + Math.max(1, i.weight),
                    0,
                  );
                  const prob = (p.weight / totalW) * 100;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-xs"
                    >
                      <span className="font-bold text-[#302b26]">
                        {p.label}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#7a6d60]">
                        {prob.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 3. 雙軌任務賺點中心（每日任務 ＋ 里程碑任務） */}
      <section className="rounded-3xl border border-[#e5d8c8] bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0e6da] pb-3.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#302b26]">任務賺點中心</h3>
            {claimableCount > 0 && (
              <span className="rounded-full bg-[#935941] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                {claimableCount} 項可領取
              </span>
            )}
          </div>
          <span className="text-xs text-[#7a6d60]">
            完成站內互動即可領點，每筆均採合理額度發放
          </span>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {/* 每日任務 */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-[#935941]">
              每日循環任務（每日重置）
            </p>
            {dailyTasks.map((task) => (
              <div
                key={task.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece1d4] bg-[#faf6f0] p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-[#302b26]">
                      {task.title}
                    </strong>
                    <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#935941]">
                      +{task.points} 點
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#75685b]">
                    {task.description}
                  </p>
                </div>

                {task.claimed ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#eef5ef] px-3 py-1.5 text-[11px] font-bold text-[#3d5c43]">
                    <Check size={13} />
                    已領取
                  </span>
                ) : task.completed ? (
                  <button
                    type="button"
                    disabled={busy === `task:${task.key}`}
                    onClick={(e) => handleClaimTask(task, e)}
                    className="shrink-0 rounded-xl bg-[#935941] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#7d4934] disabled:opacity-50"
                  >
                    領取 +{task.points}
                  </button>
                ) : (
                  <Link
                    href={task.href}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#dfd0be] bg-white px-3 py-1.5 text-[11px] font-bold text-[#5e4d3f] hover:border-[#935941] hover:text-[#935941]"
                  >
                    前往
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* 里程碑任務 */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-[#4e6752]">
              進階里程碑任務（每帳號限領 1 次）
            </p>
            {milestoneTasks.map((task) => (
              <div
                key={task.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece1d4] bg-[#faf6f0] p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-[#302b26]">
                      {task.title}
                    </strong>
                    <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#4e6752]">
                      +{task.points} 點
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#75685b]">
                    {task.description}
                  </p>
                </div>

                {task.claimed ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#eef5ef] px-3 py-1.5 text-[11px] font-bold text-[#3d5c43]">
                    <Check size={13} />
                    已領取
                  </span>
                ) : task.completed ? (
                  <button
                    type="button"
                    disabled={busy === `task:${task.key}`}
                    onClick={(e) => handleClaimTask(task, e)}
                    className="shrink-0 rounded-xl bg-[#4e6752] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#3d5340] disabled:opacity-50"
                  >
                    領取 +{task.points}
                  </button>
                ) : (
                  <Link
                    href={task.href}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#dfd0be] bg-white px-3 py-1.5 text-[11px] font-bold text-[#5e4d3f] hover:border-[#4e6752] hover:text-[#4e6752]"
                  >
                    前往
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
