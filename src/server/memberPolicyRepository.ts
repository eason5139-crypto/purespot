import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  DEFAULT_TIERS,
  evaluateCycle,
  memberPolicySchema,
  type MemberCycle,
  type MemberPolicy,
} from "@/lib/memberPolicy";
const json = (v: unknown) => v as Prisma.InputJsonValue;
export async function getMemberPolicy(): Promise<MemberPolicy> {
  const fallback: MemberPolicy = {
    periodMonths: 6,
    activatedAt: new Date().toISOString(),
    tiers: DEFAULT_TIERS,
  };
  let row;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      row = await db.outboxEvent.findUnique({
        where: { dedupeKey: "MEMBER_POLICY:v2" },
      });
      break;
    } catch (e) {
      if (
        attempt === 1 ||
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P1017", "P1001"].includes(e.code)
      )
        throw e;
    }
  }
  if (!row)
    row = await db.outboxEvent.upsert({
      where: { dedupeKey: "MEMBER_POLICY:v2" },
      create: {
        dedupeKey: "MEMBER_POLICY:v2",
        type: "MEMBER_POLICY",
        payload: json(fallback),
        processedAt: new Date(),
      },
      update: {},
    });
  return memberPolicySchema.parse(row.payload);
}
export async function saveMemberPolicy(value: unknown) {
  const parsed = memberPolicySchema.parse(value),
    old = await getMemberPolicy();
  const policy = { ...parsed, activatedAt: old.activatedAt };
  await db.outboxEvent.update({
    where: { dedupeKey: "MEMBER_POLICY:v2" },
    data: { payload: json(policy) },
  });
  return policy;
}
export async function serializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (e) {
      if (
        i < 3 &&
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(e.code)
      )
        continue;
      throw e;
    }
  }
}
export async function memberStatus(userId: string) {
  const policy = await getMemberPolicy();
  return serializable(async (tx) => {
    const [row, orders] = await Promise.all([
      tx.outboxEvent.findUnique({
        where: { dedupeKey: `MEMBER_CYCLE:${userId}` },
      }),
      tx.order.findMany({
        where: { userId, status: "COMPLETED" },
        select: {
          createdAt: true,
          totalNt: true,
          shippingNt: true,
          status: true,
        },
      }),
    ]);
    const previous = row?.payload as MemberCycle | null;
    const result = evaluateCycle(policy, previous, orders);
    if (!row || JSON.stringify(previous) !== JSON.stringify(result.cycle)) {
      await tx.outboxEvent.upsert({
        where: { dedupeKey: `MEMBER_CYCLE:${userId}` },
        create: {
          dedupeKey: `MEMBER_CYCLE:${userId}`,
          type: "MEMBER_CYCLE",
          payload: json(result.cycle),
          processedAt: new Date(),
        },
        update: { payload: json(result.cycle) },
      });
      if (result.current.couponNt > 0) {
        const key = `TIER_GIFT:${userId}:${result.cycle.startsAt}:${result.current.code}`;
        if (!(await tx.outboxEvent.findUnique({ where: { dedupeKey: key } }))) {
          const reward = await tx.reward.upsert({
            where: { id: `tier-${result.current.code}` },
            create: {
              id: `tier-${result.current.code}`,
              title: `${result.current.name}禮券`,
              pointsCost: 0,
              discountNt: result.current.couponNt,
              isActive: false,
            },
            update: { discountNt: result.current.couponNt },
          });
          const redemption = await tx.rewardRedemption.create({
            data: {
              userId,
              rewardId: reward.id,
              code: `TIER-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
              pointsCost: 0,
              discountNt: result.current.couponNt,
            },
          });
          await tx.outboxEvent.create({
            data: {
              dedupeKey: key,
              type: "MEMBER_TIER_GIFT",
              payload: { userId, redemptionId: redemption.id },
              processedAt: new Date(),
            },
          });
          await tx.outboxEvent.create({
            data: {
              dedupeKey: `COUPON_META:${redemption.id}`,
              type: "COUPON_META",
              payload: {
                userId,
                minSpendNt: result.current.couponMinNt,
                expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
                source: "升等或續等禮",
              },
              processedAt: new Date(),
            },
          });
        }
      }
    }
    return { ...result, policy };
  });
}
