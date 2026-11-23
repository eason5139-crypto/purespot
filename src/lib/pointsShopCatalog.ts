import type { MemberTierCode } from "./supportTypes";
import { DEFAULT_TIERS } from "./memberPolicy";

export type PointsItemCategory =
  | "TASTER_PACK"
  | "CRAFT_GOODS"
  | "CASH_VOUCHER"
  | "CHARITY_MEAL";

export interface PointsShopItem {
  id: string;
  code: string;
  category: PointsItemCategory;
  title: string;
  subtitle: string;
  description: string;
  pointsCost: number;
  retailValueNt: number;
  requiredTier: MemberTierCode; // "MEMBER" | "SILVER" | "GOLD"
  linkedProductId?: string; // 若為實體商品／試食包，兌換後可直接帶入購物車或隨箱寄出
  voucherDiscountNt?: number; // 若為現金放大折價券
  charityGrams?: number; // 若為公益助糧
  stock: number;
  tag: string;
  specNote: string;
}

export const POINTS_RULE = {
  spendNtPerPoint: 10, // 每消費 NT$10 累積 1 點
  ntPerPointRedeem: 1, // 結帳每 1 點折抵現金 NT$1
} as const;

export const TIER_POINTS_PERKS = DEFAULT_TIERS.map(t=>({tier:t.code,name:t.name,thresholdText:`近六個月消費滿 NT$${t.spendNt}，續等 NT$${t.retainNt}`,earnRateText:`購物回饋 ${t.earnPercent}%`,shopDiscountRate:t.shopRate,maxRedeemRatio:t.maxRedeemRatio,supportSla:t.support}));

export const POINTS_SHOP_CATEGORIES: {
  id: "ALL" | PointsItemCategory;
  label: string;
  code: string;
}[] = [
  { id: "ALL", label: "全部點數選物", code: "ALL" },
  { id: "TASTER_PACK", label: "隨箱鮮食試吃包", code: "01" },
  { id: "CRAFT_GOODS", label: "日台生活工藝器物", code: "02" },
  { id: "CASH_VOUCHER", label: "點數放大現金禮券", code: "03" },
  { id: "CHARITY_MEAL", label: "台灣街坊公益助糧", code: "04" },
];

export const POINTS_SHOP_CATALOG: PointsShopItem[] = [
  {
    id: "ps-taster-salmon-freeze",
    code: "GIFT-01",
    category: "TASTER_PACK",
    title: "鮭魚凍乾主食・職人隨箱試食包 (50g)",
    subtitle: "-40°C 真空凍乾・開袋喚醒挑嘴食慾",
    description:
      "採用單一北大西洋鮭魚原肉凍乾，可整顆作為獎勵或捏碎撒於日常乾糧上，兌換後將隨您的下一筆包裹免費封箱寄出。",
    pointsCost: 55,
    retailValueNt: 135,
    requiredTier: "MEMBER",
    linkedProductId: "salmon-freeze-cat",
    stock: 48,
    tag: "熱門換購 No.1",
    specNote: "50g 防潮鋁箔牛皮夾鏈袋 · 貓犬皆宜",
  },
  {
    id: "ps-taster-duck-pumpkin",
    code: "GIFT-02",
    category: "TASTER_PACK",
    title: "鴨肉南瓜低敏乾糧・隨行試食包 (120g)",
    subtitle: "避開雞肉過敏原・溫和南瓜膳食纖維",
    description:
      "專為對家禽雞肉敏感的毛孩設計，單一櫻桃鴨肉搭配台灣在地熟成南瓜，適合換糧前先做 3 日適口性與便型測試。",
    pointsCost: 68,
    retailValueNt: 160,
    requiredTier: "MEMBER",
    linkedProductId: "duck-pumpkin-cat",
    stock: 36,
    tag: "低敏換糧首選",
    specNote: "120g 獨立充氮保鮮包 · 單一鴨肉源",
  },
  {
    id: "ps-taster-turkey-can",
    code: "GIFT-03",
    category: "TASTER_PACK",
    title: "火雞胡蘿蔔原肉主食罐・體驗單罐 (180g)",
    subtitle: "78% 高含水鮮肉湯汁・自然補水首選",
    description:
      "柔軟細緻的火雞胸肉塊搭配鮮甜胡蘿蔔高湯，無膠類與人工防腐劑，幫助不愛喝水的毛孩在晚餐自然補足水分。",
    pointsCost: 85,
    retailValueNt: 110,
    requiredTier: "MEMBER",
    linkedProductId: "turkey-carrot-dog",
    stock: 42,
    tag: "補水佐餐推薦",
    specNote: "180g 易開罐裝 · 無人工膠類",
  },
  {
    id: "ps-craft-brass-clip",
    code: "CRAFT-01",
    category: "CRAFT_GOODS",
    title: "PURESPOT 實心黃銅防潮封口夾＆量匙二件組",
    subtitle: "台灣海島防潮必備・一匙精準對應 15g 乾糧",
    description:
      "結合封袋夾與標準 15g 定量匙的日台工藝道具，隨使用時間養成溫潤黃銅色澤，每次取食後夾緊袋口隔絕海島濕氣。",
    pointsCost: 180,
    retailValueNt: 380,
    requiredTier: "MEMBER",
    stock: 25,
    tag: "職人常備道具",
    specNote: "實心黃銅鍛造 · 長 14.5cm · 容量 15g/平匙",
  },
  {
    id: "ps-craft-ceramic-bowl",
    code: "CRAFT-02",
    category: "CRAFT_GOODS",
    title: "鶯歌窯燒・高腳護頸斜口陶瓷餐碗",
    subtitle: "暖心夥伴以上限定・15 度傾角減輕頸椎壓力",
    description:
      "與台灣鶯歌陶藝工坊合作燒製，溫潤米白釉面不易殘留油脂造成黑下巴，搭配防滑梣木底座，讓每日開飯更顯儀式感。",
    pointsCost: 360,
    retailValueNt: 720,
    requiredTier: "SILVER",
    linkedProductId: "cat-raised-bowl",
    stock: 16,
    tag: "暖心夥伴限定",
    specNote: "食品級無鉛高溫瓷 + 天然梣木座",
  },
  {
    id: "ps-craft-snuffle-mat",
    code: "CRAFT-03",
    category: "CRAFT_GOODS",
    title: "星光 VIP 典藏・森林厚織藏食嗅聞墊",
    subtitle: "星光夥伴 VIP 專屬・10 分鐘嗅聞相當於散步 30 分鐘",
    description:
      "專為雨天無法出門或精力充沛的毛孩打造，多層次極細搖粒絨藏食皺褶與防滑底布，可機洗快乾，釋放壓力並減緩狼吞虎嚥。",
    pointsCost: 480,
    retailValueNt: 690,
    requiredTier: "GOLD",
    linkedProductId: "dog-snuffle-mat",
    stock: 12,
    tag: "星光 VIP 獨享",
    specNote: "48×48cm 加厚環保搖粒絨 · 附收納束帶",
  },
  {
    id: "ps-voucher-120",
    code: "VOUCH-01",
    category: "CASH_VOUCHER",
    title: "點數放大禮遇・NT$120 結帳現金折抵券",
    subtitle: "僅需 95 點即可兌換（點數價值放大 126%）",
    description:
      "除結帳可享 1 點折 1 元外，於點數商店預先兌換此禮券，僅需 95 點即可在結帳時直接折抵 NT$120！無最低品項限制。",
    pointsCost: 95,
    retailValueNt: 120,
    requiredTier: "MEMBER",
    voucherDiscountNt: 120,
    stock: 999,
    tag: "價值放大 1.26 倍",
    specNote: "兌換後立即存入帳戶票券夾 · 結帳一鍵套用",
  },
  {
    id: "ps-voucher-350",
    code: "VOUCH-02",
    category: "CASH_VOUCHER",
    title: "暖心回饋・NT$350 結帳現金折抵券",
    subtitle: "僅需 260 點即可兌換（點數價值放大 135%）",
    description:
      "適合定期補貨主食乾糧或家庭共買時使用，以 260 點直接換取 NT$350 結帳折抵額，現省 NT$90 等值點數！",
    pointsCost: 260,
    retailValueNt: 350,
    requiredTier: "SILVER",
    voucherDiscountNt: 350,
    stock: 999,
    tag: "價值放大 1.35 倍",
    specNote: "暖心夥伴與星光 VIP 專屬放大券",
  },
  {
    id: "ps-charity-meal",
    code: "LOVE-01",
    category: "CHARITY_MEAL",
    title: "街坊浪浪溫飽計畫・認捐 200g 純淨原肉主糧",
    subtitle: "每 40 點化作一頓真實鮮肉餐・由 PURESPOT 雙倍配捐",
    description:
      "您捐出 40 點，PURESPOT 即同步配捐等量鮮肉主糧至台灣在地流浪犬貓中途協會，並於點數存摺核發「街坊助糧榮譽印記」。",
    pointsCost: 40,
    retailValueNt: 100,
    requiredTier: "MEMBER",
    charityGrams: 200,
    stock: 999,
    tag: "品牌雙倍配捐",
    specNote: "累計每滿 10kg 公開檢驗與捐贈配送紀錄",
  },
];

export function canUnlockByTier(
  userTier: MemberTierCode,
  requiredTier: MemberTierCode,
): boolean {
  const rank: Record<MemberTierCode, number> = {
    GUEST: 0,
    MEMBER: 1,
    SILVER: 2,
    GOLD: 3,
    PLATINUM: 4,
    DIAMOND: 5,
  };
  return rank[userTier] >= rank[requiredTier];
}

export function discountedPointsCost(
  basePoints: number,
  userTier: MemberTierCode,
): number {
  const rate = DEFAULT_TIERS.find((p) => p.code === userTier)?.shopRate ?? 1;
  return Math.max(1, Math.round(basePoints * rate));
}
