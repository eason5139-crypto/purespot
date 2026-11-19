import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import {
  POINTS_SHOP_CATALOG,
  canUnlockByTier,
  discountedPointsCost,
} from "@/lib/pointsShopCatalog";
import type { MemberTierCode } from "@/lib/supportTypes";

export async function membershipConfig() {
  const cfg = await db.membershipConfig.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      silverSpendNt: 3000,
      goldSpendNt: 12000,
      pointsPerHundred: 10, // 每消費 NT$10 累積 1 點（每 NT$100 累積 10 點）
    },
    update: {},
  });
  // 若舊資料庫仍為 pointsPerHundred = 1，自動升級為 10（10 元 1 點）
  if (cfg.pointsPerHundred < 10) {
    return db.membershipConfig.update({
      where: { id: "main" },
      data: { pointsPerHundred: 10 },
    });
  }
  return cfg;
}

export async function reconcilePoints(userId: string) {
  const config = await membershipConfig();
  const effectivePointsPerHundred = Math.max(10, config.pointsPerHundred);

  const [
    orders,
    pets,
    careCount,
    favoriteCount,
    family,
    communityCount,
    missionDefs,
  ] = await Promise.all([
    db.order.findMany({
      where: { userId },
      select: { id: true, status: true, totalNt: true },
    }),
    db.pet.count({ where: { userId } }),
    db.careRecord.count({ where: { userId } }),
    db.favorite.count({ where: { userId } }),
    db.familyMemberRecord.findUnique({
      where: { userId },
      include: { group: { include: { _count: { select: { members: true } } } } },
    }),
    db.communityPost.count({ where: { authorId: userId, status: "PUBLISHED" } }),
    db.memberMission.findMany({ where: { isActive: true } }),
  ]);

  const entries: {
    userId: string;
    sourceKey: string;
    title: string;
    points: number;
  }[] = [
    // 入籍開戶禮遇：每位會員享有 120 點啟動點數（可直接於結帳折抵 NT$120 或於點數商店換購試吃包）
    {
      userId,
      sourceKey: `welcome-craft:${userId}`,
      title: "會員入籍開戶禮遇（1點折NT$1）",
      points: 120,
    },
  ];

  for (const order of orders) {
    if (
      ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"].includes(order.status)
    ) {
      const earned = Math.floor(
        (order.totalNt * effectivePointsPerHundred) / 100,
      );
      if (earned > 0) {
        entries.push({
          userId,
          sourceKey: `order-10nt:${order.id}`,
          title: `購物回饋（每滿 NT$10 贈 1 點 · 訂單 #${order.id.slice(0, 8)}）`,
          points: earned,
        });
      }
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
    if (missionStatus[mission.id]) {
      entries.push({
        userId,
        sourceKey: `mission:${mission.id}:${userId}`,
        title: mission.title,
        points: mission.points,
      });
    }
  }

  if (entries.length) {
    await db.pointEntry.createMany({ data: entries, skipDuplicates: true });
  }

  const awarded = await db.pointEntry.findMany({
    where: { userId, sourceKey: { startsWith: "order-10nt:" } },
    select: { sourceKey: true, points: true },
  });
  const cancelled = new Set(
    orders
      .filter((order) => order.status === "CANCELLED")
      .map((order) => order.id),
  );
  const reversals = awarded
    .filter((entry) => cancelled.has(entry.sourceKey.slice(11)))
    .map((entry) => ({
      userId,
      sourceKey: `reversal-10nt:${entry.sourceKey.slice(11)}`,
      title: "取消訂單點數退回",
      points: -entry.points,
    }));
  if (reversals.length) {
    await db.pointEntry.createMany({ data: reversals, skipDuplicates: true });
  }

  return config;
}

export async function membershipSnapshot(userId: string) {
  const config = await reconcilePoints(userId);
  const [
    entries,
    balance,
    earnedMissions,
    memberMissions,
    orders,
    rewards,
    redemptions,
    notifications,
  ] = await Promise.all([
    db.pointEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } }),
    db.pointEntry.findMany({
      where: { userId, sourceKey: { startsWith: "mission:" } },
      select: { sourceKey: true },
    }),
    db.memberMission.findMany({ orderBy: { id: "asc" } }),
    db.order.findMany({
      where: {
        userId,
        status: { in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"] },
      },
      select: { totalNt: true },
    }),
    db.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: "asc" },
    }),
    db.rewardRedemption.findMany({
      where: { userId, orderId: null },
      include: { reward: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.memberNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const spentNt = orders.reduce((sum, order) => sum + order.totalNt, 0);
  const points = Math.max(0, balance._sum.points ?? 0);
  const tierCode: MemberTierCode =
    spentNt >= config.goldSpendNt
      ? "GOLD"
      : spentNt >= config.silverSpendNt
        ? "SILVER"
        : "MEMBER";
  const tier =
    tierCode === "GOLD"
      ? "星光夥伴"
      : tierCode === "SILVER"
        ? "暖心夥伴"
        : "新朋友";
  const nextTierNt =
    spentNt < config.silverSpendNt
      ? config.silverSpendNt
      : spentNt < config.goldSpendNt
        ? config.goldSpendNt
        : null;

  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyDrawClaimed = entries.some(
    (e) => e.sourceKey === `daily-draw:${userId}:${todayKey}`,
  );

  // 整理點數商店已兌換的實體商品與公益助糧紀錄
  const shopExchanges = entries
    .filter((e) => e.sourceKey.startsWith("shop-exchange:"))
    .map((e) => ({
      id: e.id,
      title: e.title,
      pointsCost: Math.abs(e.points),
      createdAt: e.createdAt,
    }));

  return {
    config,
    points,
    spentNt,
    tier,
    tierCode,
    nextTierNt,
    dailyDrawClaimed,
    shopExchanges,
    entries,
    rewards,
    redemptions,
    notifications,
    badges: memberMissions
      .filter(
        (mission) =>
          mission.isActive ||
          earnedMissions.some(
            (entry) => entry.sourceKey === `mission:${mission.id}:${userId}`,
          ),
      )
      .map((mission) => ({
        title: mission.badgeTitle,
        missionTitle: mission.title,
        points: mission.points,
        earned: earnedMissions.some(
          (entry) => entry.sourceKey === `mission:${mission.id}:${userId}`,
        ),
      })),
  };
}

export async function claimDailyDraw(userId: string) {
  await reconcilePoints(userId);
  const todayKey = new Date().toISOString().slice(0, 10);
  const sourceKey = `daily-draw:${userId}:${todayKey}`;

  const existing = await db.pointEntry.findUnique({ where: { sourceKey } });
  if (existing) {
    throw new ApiError(409, "今日已完成節氣福引搖獎，請明日再來！");
  }

  const prizes = [
    { ball: "GOLD", rank: "特賞・金箔球", points: 60 },
    { ball: "CLAY", rank: "壹賞・赤陶球", points: 35 },
    { ball: "JADE", rank: "貳賞・翠玉球", points: 25 },
    { ball: "WOOD", rank: "參賞・胡桃木球", points: 15 },
  ] as const;

  const roll = Math.random();
  const picked =
    roll < 0.15
      ? prizes[0]
      : roll < 0.45
        ? prizes[1]
        : roll < 0.8
          ? prizes[2]
          : prizes[3];

  const entry = await db.pointEntry.create({
    data: {
      userId,
      sourceKey,
      title: `每日節氣福引搖獎（${picked.rank}）`,
      points: picked.points,
    },
  });

  return {
    ball: picked.ball,
    rank: picked.rank,
    points: picked.points,
    entry,
  };
}

export async function exchangePointsShopItem(userId: string, itemId: string) {
  const snapshot = await membershipSnapshot(userId);
  const catalogItem = POINTS_SHOP_CATALOG.find((item) => item.id === itemId);
  if (!catalogItem) {
    throw new ApiError(404, "找不到該項點數商店選物");
  }

  if (!canUnlockByTier(snapshot.tierCode, catalogItem.requiredTier)) {
    throw new ApiError(
      403,
      `此選物為「${catalogItem.requiredTier === "GOLD" ? "星光夥伴 VIP" : "暖心夥伴"}」以上等級專屬`,
    );
  }

  const finalPointsCost = discountedPointsCost(
    catalogItem.pointsCost,
    snapshot.tierCode,
  );

  return db.$transaction(
    async (tx) => {
      const balance = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });
      const currentPoints = balance._sum.points ?? 0;
      if (currentPoints < finalPointsCost) {
        throw new ApiError(
          409,
          `點數不足（目前 ${currentPoints} 點，需 ${finalPointsCost} 點）`,
        );
      }

      const exchangeCode = `PURE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      // 若為點數放大現金折價券，同步寫入 Reward & RewardRedemption 供結帳頁直接使用
      if (
        catalogItem.category === "CASH_VOUCHER" &&
        catalogItem.voucherDiscountNt
      ) {
        const reward = await tx.reward.upsert({
          where: { id: catalogItem.id },
          create: {
            id: catalogItem.id,
            title: catalogItem.title,
            pointsCost: finalPointsCost,
            discountNt: catalogItem.voucherDiscountNt,
            isActive: true,
          },
          update: {
            title: catalogItem.title,
            pointsCost: finalPointsCost,
            discountNt: catalogItem.voucherDiscountNt,
          },
        });

        await tx.rewardRedemption.create({
          data: {
            userId,
            rewardId: reward.id,
            code: exchangeCode,
            pointsCost: finalPointsCost,
            discountNt: catalogItem.voucherDiscountNt,
          },
        });
      }

      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey: `shop-exchange:${exchangeCode}`,
          title: `點數商店換購：${catalogItem.title}（憑證 ${exchangeCode}）`,
          points: -finalPointsCost,
        },
      });

      await tx.memberNotification.create({
        data: {
          userId,
          title:
            catalogItem.category === "CHARITY_MEAL"
              ? `感謝您的街坊公益助糧：${catalogItem.title}`
              : `點數商店換購成功：${catalogItem.title}`,
          body:
            catalogItem.category === "CASH_VOUCHER"
              ? `已放入您的帳戶票券夾，結帳折抵代碼：${exchangeCode}`
              : catalogItem.category === "CHARITY_MEAL"
                ? `已為您登記認捐 ${catalogItem.charityGrams}g 純淨主糧（雙倍配捐憑證：${exchangeCode}）`
                : `已為您保留換購選物（憑證代碼：${exchangeCode}），將隨您的下一筆訂單免費隨箱寄出！`,
          href: "/rewards",
        },
      });

      return {
        exchangeCode,
        item: catalogItem,
        pointsSpent: finalPointsCost,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function redeemReward(userId: string, rewardId: string) {
  await reconcilePoints(userId);
  return db.$transaction(
    async (tx) => {
      const reward = await tx.reward.findFirst({
        where: { id: rewardId, isActive: true },
      });
      if (!reward) throw new ApiError(404, "找不到這項兌換優惠");
      const balance = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });
      if ((balance._sum.points ?? 0) < reward.pointsCost)
        throw new ApiError(409, "點數不足");
      const code = `PURE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const redemption = await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId,
          code,
          pointsCost: reward.pointsCost,
          discountNt: reward.discountNt,
        },
      });
      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey: `redeem:${redemption.id}`,
          title: `兌換 ${reward.title}`,
          points: -reward.pointsCost,
        },
      });
      await tx.memberNotification.create({
        data: {
          userId,
          title: "優惠已放進帳戶",
          body: `${reward.title} 可於結帳時使用，代碼 ${code}`,
          href: "/account?tab=membership",
        },
      });
      return redemption;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
