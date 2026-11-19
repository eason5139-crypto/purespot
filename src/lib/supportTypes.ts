export type SupportCategory =
  | "NUTRITION"
  | "ALLERGY"
  | "AUTOSHIP"
  | "ORDER"
  | "AFTER_SALES";

export type MemberTierCode = "GOLD" | "SILVER" | "MEMBER" | "GUEST";

export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface SupportChatMessage {
  id: string;
  sender: "BUYER" | "ADMIN";
  senderName: string;
  body: string;
  createdAt: string;
}

export interface SupportThread {
  id: string;
  source: "CHAT" | "ORDER_REQUEST";
  userId: string | null;
  clientToken: string;
  buyerName: string;
  buyerEmail: string;
  memberTier: MemberTierCode;
  memberTierLabel: string;
  tierPriority: number; // 1 = GOLD (最高), 2 = SILVER, 3 = MEMBER, 4 = GUEST
  totalSpentNt: number;
  ordersCount: number;
  category: SupportCategory;
  subject: string;
  status: SupportTicketStatus;
  orderId: string | null;
  petSummary: string | null;
  messages: SupportChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export const SUPPORT_CATEGORIES: {
  id: SupportCategory;
  code: string;
  label: string;
  shortLabel: string;
  desc: string;
  quickQuestions: string[];
  adminTemplates: string[];
}[] = [
  {
    id: "NUTRITION",
    code: "CAT-01",
    label: "營養配方與適口性諮詢",
    shortLabel: "營養配方",
    desc: "針對挑嘴、每日餵食克數、乾濕食混搭比例或幼老犬貓營養問題",
    quickQuestions: [
      "家裡毛孩最近聞一聞就走，建議先從凍乾還是主食罐混搭？",
      "想確認目前體重與活動量下，乾糧加鮮食餐包的每日建議克數",
    ],
    adminTemplates: [
      "您好，針對毛孩挑嘴情況，建議先以「70% 原有主食 ＋ 30% 慢焙凍乾或溫熱鮮食餐包」拌食，利用天然魚肉油脂香氣引導進食，避免一次全換造成壓力。",
      "您好，已為您核對毛孩體重與活動係數，建議早晚兩餐各搭配半包鮮食餐包並減少約 25g 乾糧，維持每日總熱量平衡並增加自然飲水攝取。",
    ],
  },
  {
    id: "ALLERGY",
    code: "CAT-02",
    label: "換糧過渡與過敏原排查",
    shortLabel: "換糧過敏",
    desc: "皮膚搔癢、軟便、單一肉源挑選與七日漸進換糧節奏規劃",
    quickQuestions: [
      "毛孩對雞肉敏感且換季容易軟便，推薦哪一款單一魚肉或鴨肉配方？",
      "目前正在進行七日換糧第 3 天，便型偏軟該如何調整比例？",
    ],
    adminTemplates: [
      "您好，若毛孩對雞肉敏感，我們首推「鮭魚溫和配方主食」或「鴨肉南瓜成貓乾糧」，全配方採用單一動物蛋白並排除家禽油脂，能大幅降低腸道刺激。",
      "您好，換糧第 3 天若出現微軟便，建議先退回「25% 新糧 ＋ 75% 舊糧」維持 2 至 3 日，待腸道菌叢適應、便型穩定後再推進至 50% 比例。",
    ],
  },
  {
    id: "AUTOSHIP",
    code: "CAT-03",
    label: "定期配週期與存糧調度",
    shortLabel: "定期配送",
    desc: "修改定期配出貨日、海島梅雨季分裝保存、跳過當期或更換口味",
    quickQuestions: [
      "下個月要出遠門，想將定期配出貨時間延後兩週可以嗎？",
      "台灣梅雨季濕度高，大包裝開封後該如何搭配定期配週期最保鮮？",
    ],
    adminTemplates: [
      "您好，已為您確認定期配排程！我們已協助將下一期配送日順延 14 天，期間依然享有定期配 9 折與免運禮遇，請安心出遊。",
      "您好，台灣海島濕度常逾 80%，建議開封後連同原袋放入密封桶並於 35 日內食用完畢；您也可以改選「每 4 週小包裝定期配」，確保每口都是剛開袋的酥脆度。",
    ],
  },
  {
    id: "ORDER",
    code: "CAT-04",
    label: "訂單進度與配送查詢",
    shortLabel: "訂單物流",
    desc: "查詢出貨批次、黑貓／超商物流狀態、變更收件地址或發票事宜",
    quickQuestions: [
      "想查詢剛下單的商品預計哪一天會安排出貨？",
      "訂單尚未出貨，想協助修改收件人電話或配送時段",
    ],
    adminTemplates: [
      "您好，您的訂單已完成鮮食批次檢驗與防潮封箱，預計於今日下午交由溫控物流寄出，明日即可送達指定地址。",
      "您好，已為您在出貨前攔截更新收件資訊與指定配送時段，稍後物流單號產生後會同步推播至您的會員通知中心。",
    ],
  },
  {
    id: "AFTER_SALES",
    code: "CAT-05",
    label: "退換貨與售後服務",
    shortLabel: "退換售後",
    desc: "包裝受損補寄、試吃包申請、口味不合適退換或商品異常反映",
    quickQuestions: [
      "收到包裹發現外箱有擠壓痕跡，想確認內部夾鏈袋氣密狀態",
      "買了兩包但毛孩吃不習慣，未拆封的那一包可以申請換成鮭魚口味嗎？",
    ],
    adminTemplates: [
      "您好，非常重視您的包裹體驗！我們已立即為您安排一包全新批次商品免費補寄，原商品無須寄回，請先檢查夾鏈是否完好。",
      "您好，未拆封且保存完好的商品享有 14 日安心換貨保障。已為您登記更換為「鮭魚低敏配方」，物流人員將於收回同時為您送上新口味。",
    ],
  },
];

export const MEMBER_TIER_META: Record<
  MemberTierCode,
  {
    code: MemberTierCode;
    label: string;
    priority: number;
    slaText: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  }
> = {
  GOLD: {
    code: "GOLD",
    label: "星光夥伴 VIP",
    priority: 1,
    slaText: "P1 尊榮最優先（15 分鐘內專人響應）",
    badgeBg: "bg-[#fcf3dc]",
    badgeText: "text-[#8a5812]",
    badgeBorder: "border-[#dfb86c]",
  },
  SILVER: {
    code: "SILVER",
    label: "暖心夥伴",
    priority: 2,
    slaText: "P2 進階優先（1 小時內優先處理）",
    badgeBg: "bg-[#eef4ef]",
    badgeText: "text-[#3d5c43]",
    badgeBorder: "border-[#b8ceb9]",
  },
  MEMBER: {
    code: "MEMBER",
    label: "新朋友會員",
    priority: 3,
    slaText: "P3 標準會員通道（4 小時內回覆）",
    badgeBg: "bg-[#f7efe6]",
    badgeText: "text-[#935941]",
    badgeBorder: "border-[#dec7b0]",
  },
  GUEST: {
    code: "GUEST",
    label: "訪客諮詢",
    priority: 4,
    slaText: "P4 一般諮詢通道（24 小時內回覆）",
    badgeBg: "bg-[#f3EFEA]",
    badgeText: "text-[#6e6257]",
    badgeBorder: "border-[#dcd2c6]",
  },
};

export function resolveMemberTier(
  spentNt: number,
  isLoggedIn: boolean,
  config = { silverSpendNt: 3000, goldSpendNt: 12000 },
): MemberTierCode {
  if (!isLoggedIn) return "GUEST";
  if (spentNt >= config.goldSpendNt) return "GOLD";
  if (spentNt >= config.silverSpendNt) return "SILVER";
  return "MEMBER";
}

export function mapLegacyKindToCategory(kind: string): SupportCategory {
  if (kind === "RETURN") return "AFTER_SALES";
  if (kind === "ISSUE") return "ORDER";
  if (
    kind === "NUTRITION" ||
    kind === "ALLERGY" ||
    kind === "AUTOSHIP" ||
    kind === "ORDER" ||
    kind === "AFTER_SALES"
  ) {
    return kind;
  }
  return "NUTRITION";
}

export const INITIAL_DEMO_THREADS: SupportThread[] = [
  {
    id: "thread-vip-01",
    source: "CHAT",
    userId: null,
    clientToken: "demo-vip-01",
    buyerName: "林語彤（麻糬媽咪）",
    buyerEmail: "yutung.lin@example.com",
    memberTier: "GOLD",
    memberTierLabel: "星光夥伴 VIP",
    tierPriority: 1,
    totalSpentNt: 18650,
    ordersCount: 9,
    category: "ALLERGY",
    subject: "換季腸胃敏感＋避開雞肉的凍乾混搭比例請教",
    status: "OPEN",
    orderId: "PS-202611-8821",
    petSummary: "麻糬（英國短毛貓 · 4.5kg · 2歲4個月 · 避開過敏原：雞肉）",
    messages: [
      {
        id: "msg-vip-1",
        sender: "BUYER",
        senderName: "林語彤（麻糬媽咪）",
        body: "您好！麻糬目前吃鮭魚低敏成貓糧很穩定，但最近台北連日下雨氣溫驟降，想幫牠加一點「鮭魚凍乾主食」跟「鮭魚菠菜主食罐」增加喝水量，請問在不影響腸胃的前提下，早晚兩餐克數該怎麼分配最理想？",
        createdAt: "2026-11-19T01:15:00.000Z",
      },
    ],
    createdAt: "2026-11-19T01:15:00.000Z",
    updatedAt: "2026-11-19T01:15:00.000Z",
  },
  {
    id: "thread-silver-02",
    source: "CHAT",
    userId: null,
    clientToken: "demo-silver-02",
    buyerName: "陳冠宇（芒果爸）",
    buyerEmail: "kuanyu.chen@example.com",
    memberTier: "SILVER",
    memberTierLabel: "暖心夥伴",
    tierPriority: 2,
    totalSpentNt: 6420,
    ordersCount: 4,
    category: "NUTRITION",
    subject: "柴犬周末爬山後的體能高蛋白風乾糧補充疑問",
    status: "IN_PROGRESS",
    orderId: "PS-202611-6410",
    petSummary: "芒果（柴犬 · 10kg · 3歲 · 避開過敏原：牛肉）",
    messages: [
      {
        id: "msg-sil-1",
        sender: "BUYER",
        senderName: "陳冠宇（芒果爸）",
        body: "芒果每週六日都會去走步道 2 小時，平日吃鮮雞均衡成犬糧（每日約 173g），如果運動日想搭配「羊肉風乾主食」當作晚餐加強肌肉修復，該替換掉多少乾糧？",
        createdAt: "2026-11-18T14:20:00.000Z",
      },
      {
        id: "msg-sil-2",
        sender: "ADMIN",
        senderName: "PURESPOT 首席營養師・阿哲",
        body: "冠宇您好！芒果 10kg 在高活動日熱量需求會提升約 15%。建議運動日晚餐可將原乾糧減少 40g，改加入 45g「羊肉風乾主食」，不僅避開芒果過敏的牛肉，更能補充優質支鏈胺基酸！",
        createdAt: "2026-11-18T14:42:00.000Z",
      },
      {
        id: "msg-sil-3",
        sender: "BUYER",
        senderName: "陳冠宇（芒果爸）",
        body: "太清楚了！那我還可以同時搭配「火雞胡蘿蔔主食罐」拌在裡面嗎？",
        createdAt: "2026-11-19T02:05:00.000Z",
      },
    ],
    createdAt: "2026-11-18T14:20:00.000Z",
    updatedAt: "2026-11-19T02:05:00.000Z",
  },
  {
    id: "thread-member-03",
    source: "CHAT",
    userId: null,
    clientToken: "demo-member-03",
    buyerName: "許雅筑",
    buyerEmail: "yazhu.hsu@example.com",
    memberTier: "MEMBER",
    memberTierLabel: "新朋友會員",
    tierPriority: 3,
    totalSpentNt: 1280,
    ordersCount: 1,
    category: "AUTOSHIP",
    subject: "梅雨季定期配改為每 4 週小包裝的設定方式",
    status: "OPEN",
    orderId: null,
    petSummary: "布丁（米克斯貓 · 3.8kg · 1歲6個月）",
    messages: [
      {
        id: "msg-mem-1",
        sender: "BUYER",
        senderName: "許雅筑",
        body: "你好，我們家住在基隆比較潮濕，想把下個月的定期配從雙月大包裝改成每 4 週配送一次，請問可以在後台協助調整嗎？",
        createdAt: "2026-11-19T00:30:00.000Z",
      },
    ],
    createdAt: "2026-11-19T00:30:00.000Z",
    updatedAt: "2026-11-19T00:30:00.000Z",
  },
  {
    id: "thread-aftersales-04",
    source: "CHAT",
    userId: null,
    clientToken: "demo-vip-04",
    buyerName: "張家豪",
    buyerEmail: "chiahao.chang@example.com",
    memberTier: "GOLD",
    memberTierLabel: "星光夥伴 VIP",
    tierPriority: 1,
    totalSpentNt: 15200,
    ordersCount: 7,
    category: "AFTER_SALES",
    subject: "申請未拆封鮮雞貓糧更換為鴨肉南瓜配方",
    status: "RESOLVED",
    orderId: "PS-202611-5190",
    petSummary: "圓圓（曼赤肯 · 3.6kg · 4歲）",
    messages: [
      {
        id: "msg-af-1",
        sender: "BUYER",
        senderName: "張家豪",
        body: "這次買了兩包主食，其中一包未拆封想換成「鴨肉南瓜成貓乾糧」讓圓圓換個口味，請問如何辦理？",
        createdAt: "2026-11-17T09:10:00.000Z",
      },
      {
        id: "msg-af-2",
        sender: "ADMIN",
        senderName: "PURESPOT 客服專員・小嵐",
        body: "家豪您好，感謝您長期身為星光夥伴 VIP 的支持！已為您啟動 VIP 免運換貨通道，明日黑貓物流送達「鴨肉南瓜成貓乾糧」時，直接將未拆封商品交予司機即可，差額已折抵為會員點數 50 點。",
        createdAt: "2026-11-17T09:22:00.000Z",
      },
    ],
    createdAt: "2026-11-17T09:10:00.000Z",
    updatedAt: "2026-11-17T09:22:00.000Z",
  },
];
