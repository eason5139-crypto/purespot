"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck2, Check, CheckCircle2, Coins, Gift, LogIn } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest } from "@/lib/accountTypes";
import { useArcadeFeedback, PawCompanion } from "./ArcadeFeedback";
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
  checkInStatus: CheckInStatus;
  arcadeTasks: ArcadeTaskStatus[];
  onRequireAuth: () => void;
  onRefresh: () => Promise<void>;
}
export function PointsArcadeHub({ isLoggedIn, checkInStatus, arcadeTasks, onRequireAuth, onRefresh }: PointsArcadeHubProps) {
  const feedback=useArcadeFeedback();
  const [busy,setBusy]=useState("");
  const dailyTasks=arcadeTasks.filter(t=>t.scope==="DAILY"), milestoneTasks=arcadeTasks.filter(t=>t.scope==="MILESTONE"), claimableCount=arcadeTasks.filter(t=>t.completed&&!t.claimed).length;
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
      feedback.win();
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
      feedback.win();
      await onRefresh();
      toast.success(`已領取「${task.title}」獎勵 +${task.points} 點`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "領取失敗");
    } finally {
      setBusy("");
    }
  }

  return <div className="arcade-room space-y-6">
    <div className="arcade-welcome"><div><h2>每天一小步，留下陪伴的記號。</h2><p>簽到與任務分開記錄，每筆回饋都找得到。</p>{feedback.controls}</div><PawCompanion wins={feedback.wins}/></div>
      {/* 1. 每日登入簽到（固定 +10 點，連簽 7 天額外 +30 點） */}
      <section className="rounded-3xl border border-[#d3e0e7] bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[#eaf1f5] text-[#315f86]">
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18344c]">
                每日登入簽到
              </h3>
              <p className="text-xs text-[#6e6257]">
                每日簽到固定領{" "}
                <strong className="font-mono text-[#315f86]">
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
                : "bg-[#315f86] text-white shadow-xs hover:bg-[#244d70] disabled:opacity-50"
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
                      ? "border-[#315f86] bg-[#eaf1f5]"
                      : isDay7
                        ? "border-[#e2c896] bg-[#fcf6e8]"
                        : "border-[#ede2d5] bg-[#f1f5f7]"
                }`}
              >
                <span className="font-mono text-[10px] font-bold text-[#647581]">
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
                    <span className="flex size-7 items-center justify-center rounded-full bg-white font-mono text-[11px] font-bold text-[#315f86] border border-[#d3e0e7]">
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

      {/* 3. 雙軌任務賺點中心（每日任務 ＋ 里程碑任務） */}
      <section className="rounded-3xl border border-[#d3e0e7] bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0e6da] pb-3.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#18344c]">任務賺點中心</h3>
            {claimableCount > 0 && (
              <span className="rounded-full bg-[#315f86] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                {claimableCount} 項可領取
              </span>
            )}
          </div>
          <span className="text-xs text-[#647581]">
            完成站內互動即可領點，每筆均採合理額度發放
          </span>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {/* 每日任務 */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-[#315f86]">
              每日循環任務（每日重置）
            </p>
            {dailyTasks.map((task) => (
              <div
                key={task.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece1d4] bg-[#f1f5f7] p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-[#18344c]">
                      {task.title}
                    </strong>
                    <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#315f86]">
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
                    className="shrink-0 rounded-xl bg-[#315f86] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#244d70] disabled:opacity-50"
                  >
                    領取 +{task.points}
                  </button>
                ) : (
                  <Link
                    href={task.href}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#dfd0be] bg-white px-3 py-1.5 text-[11px] font-bold text-[#5e4d3f] hover:border-[#315f86] hover:text-[#315f86]"
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
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece1d4] bg-[#f1f5f7] p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-[#18344c]">
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
  </div>;
}
