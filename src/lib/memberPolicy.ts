import { z } from "zod";
export const TIER_CODES = [
  "MEMBER",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
] as const;
export type TierCode = (typeof TIER_CODES)[number];
export const tierRuleSchema = z
  .object({
    code: z.enum(TIER_CODES),
    name: z.string().trim().min(2).max(20),
    spendNt: z.number().int().min(0).max(10000000),
    retainNt: z.number().int().min(0).max(10000000),
    earnPercent: z.number().min(0).max(30),
    discountPercent: z.number().min(0).max(20),
    couponNt: z.number().int().min(0).max(3000),
    couponMinNt: z.number().int().min(0).max(100000),
    freeShippingNt: z.number().int().min(0).max(10000),
    maxRedeemRatio: z.number().min(0).max(1),
    shopRate: z.number().min(0.5).max(1),
    support: z.string().min(1).max(60),
  })
  .strict();
export const memberPolicySchema = z
  .object({
    periodMonths: z.literal(6),
    activatedAt: z.iso.datetime(),
    tiers: z.array(tierRuleSchema).length(5),
  })
  .strict()
  .superRefine((v, ctx) => {
    v.tiers.forEach((t, i) => {
      if (
        t.code !== TIER_CODES[i] ||
        (i === 0 && (t.spendNt !== 0 || t.retainNt !== 0)) ||
        (i > 0 &&
          (t.spendNt <= v.tiers[i - 1]!.spendNt ||
            t.retainNt <= v.tiers[i - 1]!.retainNt)) ||
        t.retainNt > t.spendNt ||
        t.couponNt > t.couponMinNt
      )
        ctx.addIssue({
          code: "custom",
          message:
            "五級須依序設定，續等門檻不能高於升等門檻，票券不得超過使用門檻",
          path: ["tiers", i],
        });
    });
  });
export type MemberPolicy = z.infer<typeof memberPolicySchema>;
export type TierRule = z.infer<typeof tierRuleSchema>;
export const DEFAULT_TIERS: TierRule[] = [
  {
    code: "MEMBER",
    name: "初見會員",
    spendNt: 0,
    retainNt: 0,
    earnPercent: 3,
    discountPercent: 0,
    couponNt: 0,
    couponMinNt: 0,
    freeShippingNt: 999,
    maxRedeemRatio: 0.3,
    shopRate: 1,
    support: "標準會員客服",
  },
  {
    code: "SILVER",
    name: "日常夥伴",
    spendNt: 3000,
    retainNt: 1800,
    earnPercent: 5,
    discountPercent: 2,
    couponNt: 50,
    couponMinNt: 600,
    freeShippingNt: 899,
    maxRedeemRatio: 0.35,
    shopRate: 0.98,
    support: "會員優先排隊",
  },
  {
    code: "GOLD",
    name: "暖心夥伴",
    spendNt: 10000,
    retainNt: 6000,
    earnPercent: 9,
    discountPercent: 3,
    couponNt: 100,
    couponMinNt: 1000,
    freeShippingNt: 799,
    maxRedeemRatio: 0.4,
    shopRate: 0.95,
    support: "進階優先客服",
  },
  {
    code: "PLATINUM",
    name: "摯愛夥伴",
    spendNt: 24000,
    retainNt: 14400,
    earnPercent: 12,
    discountPercent: 5,
    couponNt: 180,
    couponMinNt: 1800,
    freeShippingNt: 699,
    maxRedeemRatio: 0.45,
    shopRate: 0.92,
    support: "高階優先客服",
  },
  {
    code: "DIAMOND",
    name: "星光家人",
    spendNt: 48000,
    retainNt: 28800,
    earnPercent: 15,
    discountPercent: 7,
    couponNt: 300,
    couponMinNt: 3000,
    freeShippingNt: 499,
    maxRedeemRatio: 0.5,
    shopRate: 0.9,
    support: "最高優先客服",
  },
];
export function addCalendarMonths(date: Date, count: number) {
  const result = new Date(date),
    day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + count);
  const last = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}
export type MemberCycle = {
  tierCode: TierCode;
  startsAt: string;
  expiresAt: string;
  overrideTier?: TierCode | null;
  overrideUntil?: string | null;
};
export type SpendOrder = {
  createdAt: Date | string;
  totalNt: number;
  shippingNt: number;
  status: string;
};
export function qualifyingSpend(orders: SpendOrder[], from: Date, to: Date) {
  return orders
    .filter(
      (o) =>
        o.status === "COMPLETED" &&
        new Date(o.createdAt) >= from &&
        new Date(o.createdAt) < to,
    )
    .reduce((s, o) => s + Math.max(0, o.totalNt - o.shippingNt), 0);
}
export function evaluateCycle(
  policy: MemberPolicy,
  previous: MemberCycle | null,
  orders: SpendOrder[],
  now = new Date(),
) {
  const windowStart = addCalendarMonths(now, -6);
  const spendNt = qualifyingSpend(
    orders,
    windowStart,
    new Date(now.getTime() + 1),
  );
  const candidate = [...policy.tiers]
    .reverse()
    .find((t) => spendNt >= t.spendNt)!;
  let cycle: MemberCycle = previous
    ? { ...previous }
    : {
        tierCode: candidate.code,
        startsAt: now.toISOString(),
        expiresAt: addCalendarMonths(now, 6).toISOString(),
      };
  const rank = (code: TierCode) => TIER_CODES.indexOf(code);
  if (new Date(cycle.expiresAt) <= now) {
    // Only the most recent six-month window decides renewal, even after a long absence.
    const kept = [...policy.tiers]
      .reverse()
      .find(
        (t) => rank(t.code) <= rank(cycle.tierCode) && spendNt >= t.retainNt,
      )!;
    cycle = {
      ...cycle,
      tierCode: kept.code,
      startsAt: now.toISOString(),
      expiresAt: addCalendarMonths(now, 6).toISOString(),
    };
  }
  if (rank(candidate.code) > rank(cycle.tierCode))
    cycle = {
      ...cycle,
      tierCode: candidate.code,
      startsAt: now.toISOString(),
      expiresAt: addCalendarMonths(now, 6).toISOString(),
    };
  const manual =
    cycle.overrideTier &&
    (!cycle.overrideUntil || new Date(cycle.overrideUntil) > now)
      ? cycle.overrideTier
      : null;
  const current = policy.tiers.find(
    (t) => t.code === (manual ?? cycle.tierCode),
  )!;
  const next = policy.tiers[rank(current.code) + 1] ?? null;
  return {
    cycle,
    current,
    next,
    spendNt,
    windowStart: windowStart.toISOString(),
    renewRemainingNt: Math.max(0, current.retainNt - spendNt),
    upgradeRemainingNt: next ? Math.max(0, next.spendNt - spendNt) : 0,
    manual: Boolean(manual),
  };
}
export function priceForMember(
  priceNt: number,
  autoship: boolean,
  tier: TierRule,
  autoshipRate = 0.9,
) {
  return Math.round(
    priceNt *
      Math.min(1 - tier.discountPercent / 100, autoship ? autoshipRate : 1),
  );
}
export const MEMBER_RULES = [
  "以最近六個月內下單、且已完成的訂單計算。運費、取消訂單、票券及點數折抵部分不計入消費與回饋。",
  "達到升等門檻即升等，該等級從升等日起保留六個月。期間不會因較早的訂單移出計算區間而提前降等。",
  "到期時檢查最近六個月的完成訂單；達到續等門檻即可延續六個月，未達時調整至消費符合的等級，不會讓所有會員一起歸零。",
  "每筆訂單依下單時的等級記錄回饋比例，完成後入帳。升等後的較高回饋用在下一筆訂單，不追溯改寫舊訂單。",
  "會員商品折扣與定期配送優惠採較優惠者，不重複相乘。每筆限用一張票券，再依會員上限使用點數；1 點折 1 元。",
  "升等或續等禮券每個會員期間發一次；跨級升等只發目前新等級的券，有效 60 天，使用門檻會顯示在我的票券。",
  "任務、問卷及遊戲獲得的點數可兌換或折抵，但不計為升等消費。既有點數與已領票券保留。",
];
