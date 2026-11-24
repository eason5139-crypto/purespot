import "server-only";
import { createHash, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import { serializable } from "./memberPolicyRepository";
import { getArcadeConfig, getTaipeiDateKey } from "./pointsArcadeRepository";
import { pickWeightedIndex, type PointsArcadeConfig } from "@/lib/pointsArcadeConfig";
import type { ArcadeOutcome, ArcadePlayInput, ArcadeState } from "@/lib/arcade";

const receiptPrefix = (userId: string) => `ARCADE_PLAY:${userId}:`;
const revisionOf = (config: PointsArcadeConfig) => createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 16);
const json = (v: unknown) => v as Prisma.InputJsonValue;
type Receipt = { fingerprint: string; result: ArcadeOutcome };

export async function arcadeState(userId: string): Promise<ArcadeState> {
  const date = getTaipeiDateKey();
  const [config, balance, capsuleUsed, scratchUsed, rows] = await Promise.all([
    getArcadeConfig(),
    db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } }),
    db.pointEntry.count({ where: { userId, sourceKey: { startsWith: `fukubiki-cost:${userId}:${date}:` } } }),
    db.pointEntry.count({ where: { userId, sourceKey: { startsWith: `scratch-cost:${userId}:${date}:` } } }),
    db.outboxEvent.findMany({ where: { type: "ARCADE_PLAY", dedupeKey: { startsWith: receiptPrefix(userId) } }, orderBy: { createdAt: "desc" }, take: 6, select: { payload: true } }),
  ]);
  let points = balance._sum.points;
  if (points === null) {
    // First-time members get the existing welcome benefit without a full order/task reconciliation.
    await db.pointEntry.createMany({ data: [{ userId, sourceKey: `welcome-craft:${userId}`, title: "新會員入會禮遇（1點折NT$1）", points: 100 }], skipDuplicates: true });
    const latest = await db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } });
    points = latest._sum.points;
  }
  return {
    config, revision: revisionOf(config), points: Math.max(0, points ?? 0),
    limits: { capsuleUsed, scratchUsed, date },
    history: rows.map(row => (row.payload as unknown as Receipt).result),
  };
}

/** A receipt, point movements and voucher are committed together. Retrying an ID returns its first result. */
export async function playArcade(userId: string, input: ArcadePlayInput): Promise<ArcadeOutcome> {
  const key = `${receiptPrefix(userId)}${input.requestId}`;
  const fingerprint = `${input.game}:${input.game === "wheel" ? input.wheelKey ?? "CAT" : ""}`;
  const readReceipt = (payload: unknown) => {
    const receipt = payload as Receipt;
    if (receipt.fingerprint !== fingerprint) throw new ApiError(409, "這一回合已用於另一款遊戲，請先確認原來的結果");
    return receipt.result;
  };
  // A completed retry does not need another transaction or a current config lookup.
  const previous = await db.outboxEvent.findUnique({ where: { dedupeKey: key }, select: { payload: true } });
  if (previous) return readReceipt(previous.payload);
  const config = await getArcadeConfig();
  if (input.revision && input.revision !== revisionOf(config)) throw new ApiError(409, "獎池剛剛更新，請更新遊戲後再開始；本次尚未扣點");
  const wheelKey = input.wheelKey ?? "CAT";
  const pool = input.game === "wheel" ? config.wheels[wheelKey] : input.game === "capsule" ? config.fukubiki : config.scratch;
  const date = getTaipeiDateKey();
  const prefix = input.game === "wheel" ? `wheel-cost:${userId}:` : `${input.game === "capsule" ? "fukubiki" : "scratch"}-cost:${userId}:${date}:`;

  return serializable(async tx => {
    const existing = await tx.outboxEvent.findUnique({ where: { dedupeKey: key }, select: { payload: true } });
    if (existing) return readReceipt(existing.payload);
    const [balance, usedToday] = await Promise.all([
      tx.pointEntry.aggregate({ where: { userId }, _sum: { points: true } }),
      input.game === "wheel" ? Promise.resolve(0) : tx.pointEntry.count({ where: { userId, sourceKey: { startsWith: prefix } } }),
    ]);
    const current = balance._sum.points ?? 0;
    const dailyLimit = "dailyLimit" in pool ? pool.dailyLimit : undefined;
    if (dailyLimit !== undefined && usedToday >= dailyLimit) throw new ApiError(429, `今天已玩滿 ${dailyLimit} 次，明天再來找毛孩玩！`);
    if (current < pool.costPoints) throw new ApiError(409, `目前有 ${Math.max(0, current)} 點，本回合需要 ${pool.costPoints} 點`);
    const prizeIndex = pickWeightedIndex<{ weight: number }>(pool.prizes, randomInt(0, 1_000_000_000) / 1_000_000_000);
    const prize = pool.prizes[prizeIndex]!;
    const title = input.game === "wheel" ? config.wheels[wheelKey].title : input.game === "capsule" ? "毛孩扭蛋機" : "幸運刮刮卡";
    const kind = "kind" in prize ? prize.kind : "POINTS";
    const value = "value" in prize ? prize.value : prize.points;
    const label = "label" in prize ? prize.label : `${prize.rank}・${prize.points} 點`;
    const wonPoints = kind === "POINTS" ? value : 0;
    const runId = input.requestId.toUpperCase();
    const code = kind === "POINTS" ? null : `PURE-${createHash("sha256").update(`${userId}:${input.requestId}`).digest("hex").slice(0, 24).toUpperCase()}`;
    const winPrefix = prefix.replace("-cost:", "-win:");
    await tx.pointEntry.createMany({ data: [
      { userId, sourceKey: `${prefix}${runId}`, title: `${title}投入點數`, points: -pool.costPoints },
      ...(wonPoints > 0 ? [{ userId, sourceKey: `${winPrefix}${runId}`, title: `${title}中獎：${label}`, points: wonPoints }] : []),
    ] });
    if (code) {
      const rewardId = `${input.game === "wheel" ? `wheel-${wheelKey.toLowerCase()}` : "scratch"}-${prize.id}`;
      await tx.reward.upsert({ where: { id: rewardId }, create: { id: rewardId, title: `${title}・${label}`, pointsCost: pool.costPoints, discountNt: value, isActive: false }, update: { title: `${title}・${label}`, discountNt: value } });
      await tx.rewardRedemption.create({ data: { userId, rewardId, code, pointsCost: pool.costPoints, discountNt: value } });
      await tx.memberNotification.create({ data: { userId, title: `${title}中獎：${label}`, body: `票券已存入「我的票券」，結帳可折抵 NT$${value}。`, href: "/account?tab=tickets" } });
    }
    const result: ArcadeOutcome = {
      requestId: input.requestId, game: input.game, title, label, kind, value, costPoints: pool.costPoints,
      newBalance: current - pool.costPoints + wonPoints, createdAt: new Date().toISOString(), code,
      prizeIndex, prizeId: prize.id,
      ...(input.game === "wheel" ? { wheelKey } : { usedToday: usedToday + 1, dailyLimit }),
      ...("ball" in prize ? { ball: prize.ball } : {}),
    };
    await tx.outboxEvent.create({ data: { type: "ARCADE_PLAY", dedupeKey: key, payload: json({ fingerprint, result }), processedAt: new Date() } });
    return result;
  });
}
