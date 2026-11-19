import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import {
  POINTS_SHOP_CATALOG,
  canUnlockByTier,
  discountedPointsCost,
} from "@/lib/pointsShopCatalog";
import {
  pickWeightedIndex,
  type WheelKey,
} from "@/lib/pointsArcadeConfig";
import {
  getArcadeConfig,
  getTaipeiDateKey,
  getTaipeiOffsetDateKey,
  hasTaskSignal,
  listUserCertificates,
} from "./pointsArcadeRepository";
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
    {
      userId,
      sourceKey: `welcome-craft:${userId}`,
      title: "新會員入會禮遇（1點折NT$1）",
      points: 100,
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

/** 計算連續簽到天數（台北時區） */
function computeCheckInStreak(checkInDateKeys: Set<string>, todayKey: string) {
  const claimedToday = checkInDateKeys.has(todayKey);
  let streak = 0;
  const startOffset = claimedToday ? 0 : -1;
  for (let i = startOffset; i >= -60; i--) {
    const key = getTaipeiOffsetDateKey(i);
    if (checkInDateKeys.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  const cycleDay = claimedToday
    ? ((streak - 1) % 7) + 1
    : streak % 7;
  return { claimedToday, streakDays: streak, cycleDay };
}

async function evaluateTaskCompletion(
  userId: string,
  taskKey: string,
): Promise<boolean> {
  if (taskKey === "daily_browse_shop") {
    return hasTaskSignal(userId, "daily_browse_shop", true);
  }
  if (taskKey === "daily_community_interact") {
    return hasTaskSignal(userId, "daily_community_interact", true);
  }
  if (taskKey === "mile_pet_profile") {
    return (await db.pet.count({ where: { userId } })) > 0;
  }
  if (taskKey === "mile_digital_cert") {
    const { certificates } = await listUserCertificates(userId);
    return certificates.length > 0;
  }
  if (taskKey === "mile_nutrition_calc") {
    return hasTaskSignal(userId, "mile_nutrition_calc", false);
  }
  if (taskKey === "mile_community_post") {
    return (
      (await db.communityPost.count({
        where: { authorId: userId, status: { in: ["PUBLISHED", "PENDING"] } },
      })) > 0
    );
  }
  if (taskKey === "mile_first_order") {
    return (
      (await db.order.count({
        where: {
          userId,
          status: { in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"] },
        },
      })) > 0
    );
  }
  return false;
}

export async function membershipSnapshot(userId: string) {
  const [config, arcadeConfig] = await Promise.all([
    reconcilePoints(userId),
    getArcadeConfig(),
  ]);

  const todayKey = getTaipeiDateKey();

  const [
    entries,
    balance,
    earnedMissions,
    memberMissions,
    orders,
    rewards,
    redemptions,
    notifications,
    checkInEntries,
    fukubikiUsedToday,
    scratchUsedToday,
    taskClaimEntries,
    petsCount,
    postsCount,
    certData,
    browseSignal,
    communitySignal,
    calcSignal,
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
    db.pointEntry.findMany({
      where: {
        userId,
        sourceKey: { startsWith: `daily-checkin:${userId}:` },
      },
      select: { sourceKey: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.pointEntry.count({
      where: {
        userId,
        sourceKey: { startsWith: `fukubiki-cost:${userId}:${todayKey}:` },
      },
    }),
    db.pointEntry.count({
      where: {
        userId,
        sourceKey: { startsWith: `scratch-cost:${userId}:${todayKey}:` },
      },
    }),
    db.pointEntry.findMany({
      where: {
        userId,
        sourceKey: { startsWith: `task-claim:${userId}:` },
      },
      select: { sourceKey: true },
    }),
    db.pet.count({ where: { userId } }),
    db.communityPost.count({
      where: { authorId: userId, status: { in: ["PUBLISHED", "PENDING"] } },
    }),
    listUserCertificates(userId),
    hasTaskSignal(userId, "daily_browse_shop", true),
    hasTaskSignal(userId, "daily_community_interact", true),
    hasTaskSignal(userId, "mile_nutrition_calc", false),
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

  const checkInDateSet = new Set(
    checkInEntries.map((e) => e.sourceKey.split(":").pop() ?? ""),
  );
  const checkInProgress = computeCheckInStreak(checkInDateSet, todayKey);

  const claimedTaskKeys = new Set(taskClaimEntries.map((e) => e.sourceKey));
  const completionMap: Record<string, boolean> = {
    daily_browse_shop: browseSignal,
    daily_community_interact: communitySignal,
    mile_pet_profile: petsCount > 0,
    mile_digital_cert: certData.certificates.length > 0,
    mile_nutrition_calc: calcSignal,
    mile_community_post: postsCount > 0,
    mile_first_order: orders.length > 0,
  };

  const arcadeTasks = arcadeConfig.tasks
    .filter((t) => t.isActive)
    .map((task) => {
      const periodKey = task.scope === "DAILY" ? todayKey : "once";
      const claimKey = `task-claim:${userId}:${task.key}:${periodKey}`;
      const claimed = claimedTaskKeys.has(claimKey);
      const completed = claimed || Boolean(completionMap[task.key]);
      return {
        ...task,
        completed,
        claimed,
      };
    });

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
    dailyDrawClaimed: checkInProgress.claimedToday,
    checkInStatus: {
      claimedToday: checkInProgress.claimedToday,
      streakDays: checkInProgress.streakDays,
      cycleDay: checkInProgress.cycleDay,
      dailyPoints: arcadeConfig.checkIn.dailyPoints,
      streak7Bonus: arcadeConfig.checkIn.streak7Bonus,
    },
    arcadeConfig,
    arcadeLimits: {
      fukubikiUsedToday,
      fukubikiDailyLimit: arcadeConfig.fukubiki.dailyLimit,
      scratchUsedToday,
      scratchDailyLimit: arcadeConfig.scratch.dailyLimit,
    },
    arcadeTasks,
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

/** 每日登入固定領取簽到點數（+10 點，連續第 7 天額外加碼 +30 點） */
export async function claimDailyCheckIn(userId: string) {
  await reconcilePoints(userId);
  const arcadeConfig = await getArcadeConfig();
  const todayKey = getTaipeiDateKey();
  const sourceKey = `daily-checkin:${userId}:${todayKey}`;

  return db.$transaction(
    async (tx) => {
      const existing = await tx.pointEntry.findUnique({ where: { sourceKey } });
      if (existing) {
        throw new ApiError(409, "今日已完成登入簽到，明天再來領取點數！");
      }

      const recent = await tx.pointEntry.findMany({
        where: {
          userId,
          sourceKey: { startsWith: `daily-checkin:${userId}:` },
        },
        select: { sourceKey: true },
        orderBy: { createdAt: "desc" },
        take: 60,
      });
      const dateSet = new Set(
        recent.map((e) => e.sourceKey.split(":").pop() ?? ""),
      );
      dateSet.add(todayKey);
      const { streakDays } = computeCheckInStreak(dateSet, todayKey);

      const basePts = arcadeConfig.checkIn.dailyPoints;
      const isStreak7 = streakDays > 0 && streakDays % 7 === 0;
      const bonusPts = isStreak7 ? arcadeConfig.checkIn.streak7Bonus : 0;

      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey,
          title: `每日登入簽到（連續第 ${streakDays} 天）`,
          points: basePts,
        },
      });

      if (bonusPts > 0) {
        await tx.pointEntry.create({
          data: {
            userId,
            sourceKey: `daily-checkin-bonus7:${userId}:${todayKey}`,
            title: `連續簽到 7 天加碼回饋（第 ${streakDays} 天）`,
            points: bonusPts,
          },
        });
      }

      const balance = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });

      return {
        basePoints: basePts,
        bonusPoints: bonusPts,
        totalPoints: basePts + bonusPts,
        streakDays,
        isStreak7,
        newBalance: Math.max(0, balance._sum.points ?? 0),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** 寵物分類幸運轉盤（貓咪 / 狗狗 / 小寵）：花費點數抽實體商品兌換券、折價券或點數 */
export async function playPetWheel(userId: string, wheelKey: WheelKey) {
  await reconcilePoints(userId);
  const arcadeConfig = await getArcadeConfig();
  const wheel = arcadeConfig.wheels[wheelKey];
  if (!wheel || wheel.prizes.length === 0) {
    throw new ApiError(404, "找不到指定的轉盤獎池");
  }

  return db.$transaction(
    async (tx) => {
      const balance = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });
      const currentPoints = Math.max(0, balance._sum.points ?? 0);
      if (currentPoints < wheel.costPoints) {
        throw new ApiError(
          409,
          `點數不足（目前 ${currentPoints} 點，需 ${wheel.costPoints} 點）`,
        );
      }

      const runId = crypto.randomUUID().slice(0, 8).toUpperCase();
      const prizeIndex = pickWeightedIndex(wheel.prizes);
      const prize = wheel.prizes[prizeIndex]!;

      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey: `wheel-cost:${userId}:${runId}`,
          title: `${wheel.title}抽獎投入`,
          points: -wheel.costPoints,
        },
      });

      let voucherCode: string | null = null;

      if (prize.kind === "POINTS") {
        await tx.pointEntry.create({
          data: {
            userId,
            sourceKey: `wheel-win:${userId}:${runId}`,
            title: `${wheel.title}中獎：${prize.label}`,
            points: prize.value,
          },
        });
      } else {
        voucherCode = `PURE-${runId}`;
        const rewardId = `wheel-${wheelKey.toLowerCase()}-${prize.id}`;
        const reward = await tx.reward.upsert({
          where: { id: rewardId },
          create: {
            id: rewardId,
            title: `${wheel.title}・${prize.label}`,
            pointsCost: wheel.costPoints,
            discountNt: prize.value,
            isActive: false, // 不混入一般兌換目錄，專供轉盤票券核銷
          },
          update: {
            title: `${wheel.title}・${prize.label}`,
            discountNt: prize.value,
          },
        });

        await tx.rewardRedemption.create({
          data: {
            userId,
            rewardId: reward.id,
            code: voucherCode,
            pointsCost: wheel.costPoints,
            discountNt: prize.value,
          },
        });

        await tx.memberNotification.create({
          data: {
            userId,
            title: `${wheel.title}中獎：${prize.label}`,
            body: `專屬兌換碼 ${voucherCode}（可折抵 NT$${prize.value}）已存入您的票券夾，結帳可直接帶入折抵。`,
            href: "/rewards",
          },
        });
      }

      const after = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });

      return {
        wheelKey,
        wheelTitle: wheel.title,
        prizeIndex,
        prize,
        code: voucherCode,
        costPoints: wheel.costPoints,
        newBalance: Math.max(0, after._sum.points ?? 0),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** 福引倍率搖獎機（點數抽點數） */
export async function playFukubiki(userId: string) {
  await reconcilePoints(userId);
  const arcadeConfig = await getArcadeConfig();
  const cfg = arcadeConfig.fukubiki;
  const todayKey = getTaipeiDateKey();

  return db.$transaction(
    async (tx) => {
      const usedToday = await tx.pointEntry.count({
        where: {
          userId,
          sourceKey: { startsWith: `fukubiki-cost:${userId}:${todayKey}:` },
        },
      });
      if (usedToday >= cfg.dailyLimit) {
        throw new ApiError(
          429,
          `今日福引搖獎次數已達上限（${cfg.dailyLimit} 次），請明日再來！`,
        );
      }

      const balance = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });
      const currentPoints = Math.max(0, balance._sum.points ?? 0);
      if (currentPoints < cfg.costPoints) {
        throw new ApiError(
          409,
          `點數不足（目前 ${currentPoints} 點，需 ${cfg.costPoints} 點）`,
        );
      }

      const runId = crypto.randomUUID().slice(0, 8).toUpperCase();
      const picked = cfg.prizes[pickWeightedIndex(cfg.prizes)]!;

      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey: `fukubiki-cost:${userId}:${todayKey}:${runId}`,
          title: "福引搖獎機投入點數",
          points: -cfg.costPoints,
        },
      });

      if (picked.points > 0) {
        await tx.pointEntry.create({
          data: {
            userId,
            sourceKey: `fukubiki-win:${userId}:${todayKey}:${runId}`,
            title: `福引搖獎中獎（${picked.rank}）`,
            points: picked.points,
          },
        });
      }

      const after = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });

      return {
        ball: picked.ball,
        rank: picked.rank,
        pointsWon: picked.points,
        costPoints: cfg.costPoints,
        netPoints: picked.points - cfg.costPoints,
        usedToday: usedToday + 1,
        dailyLimit: cfg.dailyLimit,
        newBalance: Math.max(0, after._sum.points ?? 0),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** 每日點數刮刮樂 */
export async function playScratchCard(userId: string) {
  await reconcilePoints(userId);
  const arcadeConfig = await getArcadeConfig();
  const cfg = arcadeConfig.scratch;
  const todayKey = getTaipeiDateKey();

  return db.$transaction(
    async (tx) => {
      const usedToday = await tx.pointEntry.count({
        where: {
          userId,
          sourceKey: { startsWith: `scratch-cost:${userId}:${todayKey}:` },
        },
      });
      if (usedToday >= cfg.dailyLimit) {
        throw new ApiError(
          429,
          `今日刮刮樂已達上限（每日限 ${cfg.dailyLimit} 張），請明日再試！`,
        );
      }

      const balance = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });
      const currentPoints = Math.max(0, balance._sum.points ?? 0);
      if (currentPoints < cfg.costPoints) {
        throw new ApiError(
          409,
          `點數不足（目前 ${currentPoints} 點，需 ${cfg.costPoints} 點）`,
        );
      }

      const runId = crypto.randomUUID().slice(0, 8).toUpperCase();
      const picked = cfg.prizes[pickWeightedIndex(cfg.prizes)]!;

      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey: `scratch-cost:${userId}:${todayKey}:${runId}`,
          title: "每日點數刮刮樂開卡",
          points: -cfg.costPoints,
        },
      });

      let voucherCode: string | null = null;
      if (picked.kind === "POINTS") {
        await tx.pointEntry.create({
          data: {
            userId,
            sourceKey: `scratch-win:${userId}:${todayKey}:${runId}`,
            title: `刮刮樂中獎：${picked.label}`,
            points: picked.value,
          },
        });
      } else {
        voucherCode = `PURE-${runId}`;
        const rewardId = `scratch-${picked.id}`;
        const reward = await tx.reward.upsert({
          where: { id: rewardId },
          create: {
            id: rewardId,
            title: `刮刮樂・${picked.label}`,
            pointsCost: cfg.costPoints,
            discountNt: picked.value,
            isActive: false,
          },
          update: {
            title: `刮刮樂・${picked.label}`,
            discountNt: picked.value,
          },
        });

        await tx.rewardRedemption.create({
          data: {
            userId,
            rewardId: reward.id,
            code: voucherCode,
            pointsCost: cfg.costPoints,
            discountNt: picked.value,
          },
        });

        await tx.memberNotification.create({
          data: {
            userId,
            title: `刮刮樂中獎：${picked.label}`,
            body: `專屬折抵代碼 ${voucherCode} 已存入您的票券夾，結帳可直接折抵 NT$${picked.value}。`,
            href: "/rewards",
          },
        });
      }

      const after = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });

      return {
        prize: picked,
        code: voucherCode,
        costPoints: cfg.costPoints,
        usedToday: usedToday + 1,
        dailyLimit: cfg.dailyLimit,
        newBalance: Math.max(0, after._sum.points ?? 0),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** 領取雙軌任務點數 */
export async function claimArcadeTask(userId: string, taskKey: string) {
  await reconcilePoints(userId);
  const arcadeConfig = await getArcadeConfig();
  const task = arcadeConfig.tasks.find((t) => t.key === taskKey && t.isActive);
  if (!task) {
    throw new ApiError(404, "找不到該項任務或任務尚未開放");
  }

  const completed = await evaluateTaskCompletion(userId, task.key);
  if (!completed) {
    throw new ApiError(400, "尚未完成任務條件，請先前往指定頁面完成操作");
  }

  const periodKey = task.scope === "DAILY" ? getTaipeiDateKey() : "once";
  const sourceKey = `task-claim:${userId}:${task.key}:${periodKey}`;

  return db.$transaction(
    async (tx) => {
      const existing = await tx.pointEntry.findUnique({ where: { sourceKey } });
      if (existing) {
        throw new ApiError(409, "此任務獎勵已領取過");
      }

      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey,
          title: `任務獎勵：${task.title}`,
          points: task.points,
        },
      });

      const after = await tx.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      });

      return {
        taskKey: task.key,
        title: task.title,
        points: task.points,
        newBalance: Math.max(0, after._sum.points ?? 0),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
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
              ? `感謝您的公益助糧：${catalogItem.title}`
              : `點數商店換購成功：${catalogItem.title}`,
          body:
            catalogItem.category === "CASH_VOUCHER"
              ? `已放入您的帳戶票券夾，結帳折抵代碼：${exchangeCode}`
              : catalogItem.category === "CHARITY_MEAL"
                ? `已為您登記認捐 ${catalogItem.charityGrams}g 主糧（憑證：${exchangeCode}）`
                : `已為您保留換購商品（憑證代碼：${exchangeCode}），將隨您的下一筆訂單免費隨箱寄出。`,
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
