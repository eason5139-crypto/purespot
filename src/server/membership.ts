import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { playArcade } from "./arcadeService";
import { ApiError } from "./http";
import {
  POINTS_SHOP_CATALOG,
  canUnlockByTier,
  discountedPointsCost,
} from "@/lib/pointsShopCatalog";
import {
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
import { memberStatus, serializable } from "./memberPolicyRepository";

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
  return cfg;
}

export async function reconcilePoints(userId: string) {
  const config = await membershipConfig();
  const membership = await memberStatus(userId);
  const policy = membership.policy;
  const legacyEarned = await db.pointEntry.findMany({where:{userId,sourceKey:{startsWith:"order-10nt:"}},select:{sourceKey:true}});
  const legacyKeys = new Set(legacyEarned.map(e=>e.sourceKey));
  const pricingRows = await db.outboxEvent.findMany({where:{type:"ORDER_MEMBER_PRICING",payload:{path:["userId"],equals:userId}},select:{dedupeKey:true,payload:true}});
  const pricing = new Map(pricingRows.map(r=>[r.dedupeKey,r.payload as {earnPercent:number}]));

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
      select: { id: true, status: true, totalNt: true, shippingNt:true, createdAt:true },
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
    const legacy = order.createdAt < new Date(policy.activatedAt);
    if (legacyKeys.has(`order-10nt:${order.id}`)) continue;
    if (legacy ? ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"].includes(order.status) : order.status === "COMPLETED") {
      const rate = legacy ? 10 : pricing.get(`ORDER_MEMBER_PRICING:${order.id}`)?.earnPercent ?? membership.current.earnPercent;
      const earned = Math.floor((legacy ? order.totalNt : Math.max(0,order.totalNt-order.shippingNt))*rate/100);
      if (earned > 0) {
        entries.push({
          userId,
          sourceKey: legacy ? `order-10nt:${order.id}` : `order-v2:${order.id}`,
          title: `購物回饋（${rate}% · 訂單 #${order.id.slice(0, 8)}）`,
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
    where: { userId, OR:[{sourceKey: { startsWith: "order-10nt:" }},{sourceKey: { startsWith: "order-v2:" }}] },
    select: { sourceKey: true, points: true },
  });
  const cancelled = new Set(
    orders
      .filter((order) => order.status === "CANCELLED")
      .map((order) => order.id),
  );
  const reversals = awarded
    .filter((entry) => cancelled.has(entry.sourceKey.split(":")[1]!))
    .map((entry) => ({
      userId,
      sourceKey: `reversal-${entry.sourceKey.startsWith("order-v2:")?"v2":"10nt"}:${entry.sourceKey.split(":")[1]}`,
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
  const membership = await memberStatus(userId);

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
      where: { isActive: true,id:{notIn:POINTS_SHOP_CATALOG.map(p=>p.id)} },
      orderBy: { pointsCost: "asc" },
    }),
    db.rewardRedemption.findMany({
      where: { userId },
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

  const spentNt = membership.spendNt;
  const points = Math.max(0, balance._sum.points ?? 0);
  const tierCode = membership.current.code;
  const tier = membership.current.name;
  const nextTierNt = membership.next?.spendNt ?? null;
  const couponRows = await db.outboxEvent.findMany({where:{type:"COUPON_META",payload:{path:["userId"],equals:userId}},select:{dedupeKey:true,payload:true}});
  const couponMap = new Map(couponRows.map(r=>[r.dedupeKey,r.payload as {minSpendNt:number;expiresAt:string;source:string}]));

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
    membership,
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
    redemptions: redemptions.map(r=>{const meta=couponMap.get(`COUPON_META:${r.id}`);return {...r,...meta,status:r.orderId?"USED":meta?.expiresAt && new Date(meta.expiresAt)<new Date()?"EXPIRED":"AVAILABLE"};}),
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

/** Compatibility for clients opened before the arcade upgrade. */
export async function playPetWheel(userId: string, wheelKey: WheelKey) {
  const r=await playArcade(userId,{requestId:crypto.randomUUID(),game:"wheel",wheelKey});
  const config=await getArcadeConfig();
  return {...r,wheelTitle:r.title,prize:config.wheels[wheelKey].prizes.find(p=>p.id===r.prizeId)!};
}
export async function playFukubiki(userId: string) {
  const r=await playArcade(userId,{requestId:crypto.randomUUID(),game:"capsule"});
  return {...r,rank:r.label,pointsWon:r.value,netPoints:r.value-r.costPoints};
}
export async function playScratchCard(userId: string) {
  const r=await playArcade(userId,{requestId:crypto.randomUUID(),game:"scratch"});
  const config=await getArcadeConfig();
  return {...r,prize:config.scratch.prizes.find(p=>p.id===r.prizeId)!};
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
      `此選物為「${catalogItem.requiredTier === "GOLD" ? "暖心夥伴" : "日常夥伴"}」以上等級專屬`,
    );
  }

  const finalPointsCost = Math.max(1,Math.round(catalogItem.pointsCost*snapshot.membership.current.shopRate));

  return serializable(
    async (tx) => {
      const exchanged=await tx.pointEntry.count({where:{sourceKey:{startsWith:"shop-exchange:"},title:{startsWith:`點數商店換購：${catalogItem.title}（`}}});
      if(exchanged>=catalogItem.stock) throw new ApiError(409,"這項換購目前已額滿，請選其他商品");
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
            isActive: false,
          },
          update: {
            title: catalogItem.title,
            pointsCost: finalPointsCost,
            discountNt: catalogItem.voucherDiscountNt,
          },
        });

        const coupon=await tx.rewardRedemption.create({
          data: {
            userId,
            rewardId: reward.id,
            code: exchangeCode,
            pointsCost: finalPointsCost,
            discountNt: catalogItem.voucherDiscountNt,
          },
        });
        await tx.outboxEvent.create({data:{dedupeKey:`COUPON_META:${coupon.id}`,type:"COUPON_META",payload:{userId,minSpendNt:catalogItem.voucherDiscountNt,expiresAt:new Date(Date.now()+60*86400000).toISOString(),source:"點數商店兌換"},processedAt:new Date()}});
      }

      if(["TASTER_PACK","CRAFT_GOODS"].includes(catalogItem.category)) await tx.outboxEvent.create({data:{dedupeKey:`SHOP_ITEM:${exchangeCode}`,type:"POINTS_SHOP_ITEM",payload:{userId,itemId,title:catalogItem.title,specNote:catalogItem.specNote,exchangeCode,status:"PENDING",orderId:null},processedAt:new Date()}});

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
          href: "/account?tab=tickets",
        },
      });

      return {
        exchangeCode,
        item: catalogItem,
        pointsSpent: finalPointsCost,
      };
    },
  );
}

export async function redeemReward(userId: string, rewardId: string) {
  if(POINTS_SHOP_CATALOG.some(p=>p.id===rewardId))throw new ApiError(400,"請由點數商店的商品換購入口兌換");
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
