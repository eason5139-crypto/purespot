import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";

export async function membershipConfig() {
  return db.membershipConfig.upsert({ where: { id: "main" }, create: { id: "main" }, update: {} });
}

export async function reconcilePoints(userId: string) {
  const config = await membershipConfig();
  const [orders, pets, careCount, favoriteCount, family, communityCount, missionDefs] = await Promise.all([
    db.order.findMany({ where: { userId }, select: { id: true, status: true, totalNt: true } }),
    db.pet.count({ where: { userId } }),
    db.careRecord.count({ where: { userId } }),
    db.favorite.count({ where: { userId } }),
    db.familyMemberRecord.findUnique({ where: { userId }, include: { group: { include: { _count: { select: { members: true } } } } } }),
    db.communityPost.count({ where: { authorId: userId, status: "PUBLISHED" } }),
    db.memberMission.findMany({ where: { isActive: true } }),
  ]);
  const entries: { userId: string; sourceKey: string; title: string; points: number }[] = [];
  for (const order of orders) {
    if (["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"].includes(order.status)) {
      entries.push({ userId, sourceKey: `order:${order.id}`, title: "購物累積", points: Math.floor(order.totalNt / 100) * config.pointsPerHundred });
    }
  }
  const missionStatus: Record<string, boolean> = {
    pet: pets > 0,
    care: careCount > 0,
    favorite: favoriteCount > 0,
    family: Boolean(family && family.group._count.members > 1),
    community: communityCount > 0,
  };
  for (const mission of missionDefs) {
    if (missionStatus[mission.id]) entries.push({ userId, sourceKey: `mission:${mission.id}:${userId}`, title: mission.title, points: mission.points });
  }
  if (entries.length) await db.pointEntry.createMany({ data: entries, skipDuplicates: true });
  const awarded = await db.pointEntry.findMany({ where: { userId, sourceKey: { startsWith: "order:" } }, select: { sourceKey: true, points: true } });
  const cancelled = new Set(orders.filter((order) => order.status === "CANCELLED").map((order) => order.id));
  const reversals = awarded.filter((entry) => cancelled.has(entry.sourceKey.slice(6))).map((entry) => ({
    userId, sourceKey: `reversal:${entry.sourceKey.slice(6)}`, title: "取消訂單點數退回", points: -entry.points,
  }));
  if (reversals.length) await db.pointEntry.createMany({ data: reversals, skipDuplicates: true });
  return config;
}

export async function membershipSnapshot(userId: string) {
  const config = await reconcilePoints(userId);
  const [entries, balance, earnedMissions, memberMissions, orders, rewards, redemptions, notifications] = await Promise.all([
    db.pointEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } }),
    db.pointEntry.findMany({ where: { userId, sourceKey: { startsWith: "mission:" } }, select: { sourceKey: true } }),
    db.memberMission.findMany({ orderBy: { id: "asc" } }),
    db.order.findMany({ where: { userId, status: { in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"] } }, select: { totalNt: true } }),
    db.reward.findMany({ where: { isActive: true }, orderBy: { pointsCost: "asc" } }),
    db.rewardRedemption.findMany({ where: { userId, orderId: null }, include: { reward: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    db.memberNotification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const spentNt = orders.reduce((sum, order) => sum + order.totalNt, 0);
  const points = balance._sum.points ?? 0;
  const tier = spentNt >= config.goldSpendNt ? "星光夥伴" : spentNt >= config.silverSpendNt ? "暖心夥伴" : "新朋友";
  const nextTierNt = spentNt < config.silverSpendNt ? config.silverSpendNt : spentNt < config.goldSpendNt ? config.goldSpendNt : null;
  return { config, points, spentNt, tier, nextTierNt, entries, rewards, redemptions, notifications,
    badges: memberMissions.filter((mission) => mission.isActive || earnedMissions.some((entry) => entry.sourceKey === `mission:${mission.id}:${userId}`)).map((mission) => ({ title: mission.badgeTitle, missionTitle: mission.title, points: mission.points, earned: earnedMissions.some((entry) => entry.sourceKey === `mission:${mission.id}:${userId}`) })),
  };
}

export async function redeemReward(userId: string, rewardId: string) {
  await reconcilePoints(userId);
  return db.$transaction(async (tx) => {
    const reward = await tx.reward.findFirst({ where: { id: rewardId, isActive: true } });
    if (!reward) throw new ApiError(404, "找不到這項兌換優惠");
    const balance = await tx.pointEntry.aggregate({ where: { userId }, _sum: { points: true } });
    if ((balance._sum.points ?? 0) < reward.pointsCost) throw new ApiError(409, "點數不足");
    const code = `PURE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const redemption = await tx.rewardRedemption.create({ data: { userId, rewardId, code, pointsCost: reward.pointsCost, discountNt: reward.discountNt } });
    await tx.pointEntry.create({ data: { userId, sourceKey: `redeem:${redemption.id}`, title: `兌換 ${reward.title}`, points: -reward.pointsCost } });
    await tx.memberNotification.create({ data: { userId, title: "優惠已放進帳戶", body: `${reward.title} 可於結帳時使用，代碼 ${code}`, href: "/account?tab=membership" } });
    return redemption;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
