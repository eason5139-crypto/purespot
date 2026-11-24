import { z } from "zod";

export const WHEEL_KEYS = ["CAT", "DOG", "SMALL_PET"] as const;
export type WheelKey = (typeof WHEEL_KEYS)[number];

export const PRIZE_KINDS = ["PRODUCT_VOUCHER", "CASH_VOUCHER", "POINTS"] as const;
export type PrizeKind = (typeof PRIZE_KINDS)[number];

export const wheelPrizeSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().trim().min(1).max(36),
  shortLabel: z.string().trim().min(1).max(12),
  kind: z.enum(PRIZE_KINDS),
  /** 實體券／折價券時代表折抵 NT$；點數獎時代表獲得點數 */
  value: z.number().int().min(1).max(10000),
  weight: z.number().int().min(1).max(1000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#935941"),
});

export type WheelPrize = z.infer<typeof wheelPrizeSchema>;

export const wheelConfigSchema = z.object({
  key: z.enum(WHEEL_KEYS),
  title: z.string().trim().min(1).max(24),
  costPoints: z.number().int().min(1).max(1000),
  prizes: z.array(wheelPrizeSchema).min(4).max(10),
});

export type WheelConfig = z.infer<typeof wheelConfigSchema>;

export const fukubikiPrizeSchema = z.object({
  id: z.string().min(1).max(40),
  ball: z.enum(["GOLD", "CLAY", "JADE", "WOOD", "SAND"]),
  rank: z.string().trim().min(1).max(24),
  points: z.number().int().min(0).max(5000),
  weight: z.number().int().min(1).max(1000),
});

export type FukubikiPrize = z.infer<typeof fukubikiPrizeSchema>;

export const scratchPrizeSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1).max(32),
  kind: z.enum(["CASH_VOUCHER", "POINTS"]),
  value: z.number().int().min(1).max(5000),
  weight: z.number().int().min(1).max(1000),
});

export type ScratchPrize = z.infer<typeof scratchPrizeSchema>;

export const arcadeTaskConfigSchema = z.object({
  key: z.string().min(1).max(40),
  scope: z.enum(["DAILY", "MILESTONE"]),
  title: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(80),
  points: z.number().int().min(0).max(500),
  href: z.string().min(1).max(120),
  isActive: z.boolean(),
});

export type ArcadeTaskConfig = z.infer<typeof arcadeTaskConfigSchema>;

export const pointsArcadeConfigSchema = z.object({
  checkIn: z.object({
    dailyPoints: z.number().int().min(1).max(100),
    streak7Bonus: z.number().int().min(0).max(300),
  }),
  wheels: z.object({
    CAT: wheelConfigSchema,
    DOG: wheelConfigSchema,
    SMALL_PET: wheelConfigSchema,
  }),
  fukubiki: z.object({
    costPoints: z.number().int().min(1).max(500),
    dailyLimit: z.number().int().min(1).max(50),
    prizes: z.array(fukubikiPrizeSchema).min(3).max(8),
  }),
  scratch: z.object({
    costPoints: z.number().int().min(1).max(500),
    dailyLimit: z.number().int().min(1).max(20),
    prizes: z.array(scratchPrizeSchema).min(3).max(8),
  }),
  tasks: z.array(arcadeTaskConfigSchema).min(1).max(20),
});

export type PointsArcadeConfig = z.infer<typeof pointsArcadeConfigSchema>;

export const DEFAULT_ARCADE_CONFIG: PointsArcadeConfig = {
  checkIn: {
    dailyPoints: 10,
    streak7Bonus: 30,
  },
  wheels: {
    CAT: {
      key: "CAT",
      title: "貓咪轉盤",
      costPoints: 50,
      prizes: [
        { id: "cat-p1", label: "無穀鮮魚貓糧試吃正貨兌換券", shortLabel: "貓糧兌換券", kind: "PRODUCT_VOUCHER", value: 320, weight: 4, color: "#935941" },
        { id: "cat-p2", label: "原肉凍乾小點兌換券", shortLabel: "凍乾兌換券", kind: "PRODUCT_VOUCHER", value: 160, weight: 9, color: "#b8823c" },
        { id: "cat-p3", label: "貓用主食 NT$100 折價券", shortLabel: "折 $100", kind: "CASH_VOUCHER", value: 100, weight: 14, color: "#4e6752" },
        { id: "cat-p4", label: "80 點回饋", shortLabel: "+80 點", kind: "POINTS", value: 80, weight: 7, color: "#c9964f" },
        { id: "cat-p5", label: "貓用專區 NT$50 折價券", shortLabel: "折 $50", kind: "CASH_VOUCHER", value: 50, weight: 20, color: "#758879" },
        { id: "cat-p6", label: "35 點回饋", shortLabel: "+35 點", kind: "POINTS", value: 35, weight: 18, color: "#a77259" },
        { id: "cat-p7", label: "20 點回饋", shortLabel: "+20 點", kind: "POINTS", value: 20, weight: 18, color: "#c4a889" },
        { id: "cat-p8", label: "10 點參與禮", shortLabel: "+10 點", kind: "POINTS", value: 10, weight: 10, color: "#8c7f73" },
      ],
    },
    DOG: {
      key: "DOG",
      title: "狗狗轉盤",
      costPoints: 50,
      prizes: [
        { id: "dog-p1", label: "鮮雞均衡犬糧試吃正貨兌換券", shortLabel: "犬糧兌換券", kind: "PRODUCT_VOUCHER", value: 320, weight: 4, color: "#935941" },
        { id: "dog-p2", label: "低敏手作肉乾兌換券", shortLabel: "肉乾兌換券", kind: "PRODUCT_VOUCHER", value: 160, weight: 9, color: "#b8823c" },
        { id: "dog-p3", label: "犬用主食 NT$100 折價券", shortLabel: "折 $100", kind: "CASH_VOUCHER", value: 100, weight: 14, color: "#4e6752" },
        { id: "dog-p4", label: "80 點回饋", shortLabel: "+80 點", kind: "POINTS", value: 80, weight: 7, color: "#c9964f" },
        { id: "dog-p5", label: "犬用專區 NT$50 折價券", shortLabel: "折 $50", kind: "CASH_VOUCHER", value: 50, weight: 20, color: "#758879" },
        { id: "dog-p6", label: "35 點回饋", shortLabel: "+35 點", kind: "POINTS", value: 35, weight: 18, color: "#a77259" },
        { id: "dog-p7", label: "20 點回饋", shortLabel: "+20 點", kind: "POINTS", value: 20, weight: 18, color: "#c4a889" },
        { id: "dog-p8", label: "10 點參與禮", shortLabel: "+10 點", kind: "POINTS", value: 10, weight: 10, color: "#8c7f73" },
      ],
    },
    SMALL_PET: {
      key: "SMALL_PET",
      title: "小寵轉盤",
      costPoints: 40,
      prizes: [
        { id: "sp-p1", label: "提摩西牧草主食組兌換券", shortLabel: "牧草兌換券", kind: "PRODUCT_VOUCHER", value: 240, weight: 5, color: "#4e6752" },
        { id: "sp-p2", label: "天然果乾磨牙禮包券", shortLabel: "果乾兌換券", kind: "PRODUCT_VOUCHER", value: 130, weight: 10, color: "#b8823c" },
        { id: "sp-p3", label: "小寵專區 NT$80 折價券", shortLabel: "折 $80", kind: "CASH_VOUCHER", value: 80, weight: 15, color: "#935941" },
        { id: "sp-p4", label: "65 點回饋", shortLabel: "+65 點", kind: "POINTS", value: 65, weight: 8, color: "#c9964f" },
        { id: "sp-p5", label: "小寵專區 NT$40 折價券", shortLabel: "折 $40", kind: "CASH_VOUCHER", value: 40, weight: 20, color: "#758879" },
        { id: "sp-p6", label: "30 點回饋", shortLabel: "+30 點", kind: "POINTS", value: 30, weight: 17, color: "#a77259" },
        { id: "sp-p7", label: "18 點回饋", shortLabel: "+18 點", kind: "POINTS", value: 18, weight: 15, color: "#c4a889" },
        { id: "sp-p8", label: "8 點參與禮", shortLabel: "+8 點", kind: "POINTS", value: 8, weight: 10, color: "#8c7f73" },
      ],
    },
  },
  fukubiki: {
    costPoints: 20,
    dailyLimit: 10,
    prizes: [
      { id: "fb-gold", ball: "GOLD", rank: "特賞・金箔球", points: 100, weight: 3 },
      { id: "fb-clay", ball: "CLAY", rank: "壹賞・赤陶球", points: 45, weight: 10 },
      { id: "fb-jade", ball: "JADE", rank: "貳賞・森綠球", points: 25, weight: 22 },
      { id: "fb-wood", ball: "WOOD", rank: "參賞・原木球", points: 12, weight: 35 },
      { id: "fb-sand", ball: "SAND", rank: "肆賞・暖砂球", points: 6, weight: 30 },
    ],
  },
  scratch: {
    costPoints: 15,
    dailyLimit: 3,
    prizes: [
      { id: "sc-1", label: "NT$80 免運折抵券", kind: "CASH_VOUCHER", value: 80, weight: 6 },
      { id: "sc-2", label: "45 點點數驚喜", kind: "POINTS", value: 45, weight: 10 },
      { id: "sc-3", label: "NT$35 現金折價券", kind: "CASH_VOUCHER", value: 35, weight: 20 },
      { id: "sc-4", label: "18 點回饋", kind: "POINTS", value: 18, weight: 30 },
      { id: "sc-5", label: "8 點回饋", kind: "POINTS", value: 8, weight: 34 },
    ],
  },
  tasks: [
    {
      key: "daily_browse_shop",
      scope: "DAILY",
      title: "瀏覽商店精選商品",
      description: "前往商店查看任一商品詳情頁（每日 1 次）",
      points: 3,
      href: "/shop",
      isActive: true,
    },
    {
      key: "daily_community_interact",
      scope: "DAILY",
      title: "逛街坊社群並按讚互動",
      description: "於社群頁為任一毛孩貼文按讚或收藏（每日 1 次）",
      points: 3,
      href: "/community",
      isActive: true,
    },
    {
      key: "mile_pet_profile",
      scope: "MILESTONE",
      title: "建立毛孩健康檔案",
      description: "完成至少 1 隻毛孩的體重與過敏原資料建檔",
      points: 20,
      href: "/account",
      isActive: true,
    },
    {
      key: "mile_digital_cert",
      scope: "MILESTONE",
      title: "領取限量毛孩數位證書",
      description: "為毛孩核發專屬官方編號證書（每隻限量 1 張）",
      points: 15,
      href: "/community",
      isActive: true,
    },
    {
      key: "mile_nutrition_calc",
      scope: "MILESTONE",
      title: "使用食量與營養試算",
      description: "完成一次毛孩每日熱量或存糧預測工具計算",
      points: 10,
      href: "/care",
      isActive: true,
    },
    {
      key: "mile_community_post",
      scope: "MILESTONE",
      title: "發表首篇社群貼文",
      description: "在街坊社群分享毛孩日常並通過發佈",
      points: 25,
      href: "/community",
      isActive: true,
    },
    {
      key: "mile_first_order",
      scope: "MILESTONE",
      title: "完成首筆正式訂單",
      description: "完成站內任一筆已付款訂單",
      points: 30,
      href: "/shop",
      isActive: true,
    },
  ],
};

export function pickWeightedIndex<T extends { weight: number }>(items: T[], random = Math.random()): number {
  const total = items.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let r = random * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(1, items[i]!.weight);
    if (r <= 0) return i;
  }
  return Math.max(0, items.length - 1);
}

export function calcExpectedValue(
  items: Array<{ value?: number; points?: number; weight: number }>,
): number {
  const totalW = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (totalW <= 0) return 0;
  const weightedSum = items.reduce(
    (s, i) => s + (i.points ?? i.value ?? 0) * Math.max(0, i.weight),
    0,
  );
  return Math.round((weightedSum / totalW) * 10) / 10;
}

export interface IssuedCertificateRecord {
  serialNo: string;
  editionNumber: number;
  petId: string;
  petName: string;
  petType: string;
  breedText: string;
  weightText: string;
  allergyText: string;
  honorTitle: string;
  sealText: string;
  pledgeText: string;
  ownerName: string;
  issuedAt: string;
}
