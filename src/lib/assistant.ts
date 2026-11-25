import { z } from "zod";
export const ASSISTANT_FALLBACK_MODEL = "gemini-3.5-flash-lite";

export const assistantCategories = {
  products: "找商品",
  ingredients: "成分與過敏原",
  features: "功能與操作",
  membership: "會員與點數",
  orders: "訂單與票券",
  autoship: "定期配送",
  community: "生活圈與活動",
  pets: "毛孩與照顧",
  other: "其他問題",
} as const;
export type AssistantCategory = keyof typeof assistantCategories;
export const localHref = z
  .string()
  .max(250)
  .regex(/^\/(?!\/)[a-zA-Z0-9/?=&%_.#-]*$/, "請填站內網址")
  .refine(
    (href) => !/^\/(?:admin(?:-login)?|api)(?:[/?#]|$)/i.test(href),
    "請連結公開的前台頁面",
  );
export const assistantSettingsSchema = z
  .object({
    enabled: z.boolean(),
    name: z.literal("小P"),
    roaming: z.boolean(),
    welcome: z.string().trim().min(5).max(180),
    quickQuestions: z.array(z.string().trim().min(2).max(70)).min(1).max(8),
    aiEnabled: z.boolean(),
    tone: z.enum(["warm", "concise"]),
    answerLength: z.enum(["short", "standard"]),
    maxResults: z.number().int().min(2).max(8),
    aiTimeoutSeconds: z.number().int().min(3).max(15),
    walkPauseSeconds: z.number().int().min(3).max(20),
    historyDays: z.number().int().min(7).max(365),
    analyticsDays: z.number().int().min(7).max(365),
    analyticsEnabled: z.boolean(),
    capabilities: z
      .object({
        products: z.boolean(),
        ingredients: z.boolean(),
        features: z.boolean(),
        community: z.boolean(),
        account: z.boolean(),
        compare: z.boolean(),
        cart: z.boolean(),
      })
      .strict(),
    knowledge: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            title: z.string().trim().min(2).max(70),
            text: z.string().trim().min(2).max(900),
            keywords: z.string().max(200),
            href: localHref,
            enabled: z.boolean(),
          })
          .strict(),
      )
      .max(60),
  })
  .strict();
export type AssistantSettings = z.infer<typeof assistantSettingsSchema>;
export const defaultAssistantSettings: AssistantSettings = {
  enabled: true,
  name: "小P",
  roaming: true,
  welcome: "我是小P。想找商品、看成分，或不知道功能在哪裡，都可以問我。",
  quickQuestions: [
    "不含雞肉的貓主食",
    "家庭共買在哪裡？",
    "我有多少點數？",
    "定期配送怎麼安排？",
  ],
  aiEnabled: true,
  tone: "warm",
  answerLength: "short",
  maxResults: 5,
  aiTimeoutSeconds: 8,
  walkPauseSeconds: 6,
  historyDays: 90,
  analyticsDays: 90,
  analyticsEnabled: true,
  capabilities: {
    products: true,
    ingredients: true,
    features: true,
    community: true,
    account: true,
    compare: true,
    cart: true,
  },
  knowledge: [],
};
export function publicAssistantSettings(s: AssistantSettings) {
  return {
    enabled: s.enabled,
    name: s.name,
    roaming: s.roaming,
    welcome: s.welcome,
    quickQuestions: s.quickQuestions,
    walkPauseSeconds: s.walkPauseSeconds,
    capabilities: s.capabilities,
  };
}
export type PublicAssistantSettings = ReturnType<
  typeof publicAssistantSettings
>;
export interface AssistantDocument {
  id: string;
  title: string;
  text: string;
  href: string;
  keywords: string;
  category: AssistantCategory;
  private?: boolean;
}
export interface AssistantProduct {
  id: string;
  slug: string;
  name: string;
  image: string;
  type: string;
  category: string;
  kind: "FOOD" | "SUPPLIES";
  priceNt: number;
  stock: number;
  bagGrams: number;
  ingredients: string[];
  allergens: string[];
  proteinMin: number | null;
  moistureMax: number | null;
  kcalPer100g: number | null;
  warning: string | null;
  autoshipEligible: boolean;
  description: string;
}
export interface AssistantResult {
  category: AssistantCategory;
  products: AssistantProduct[];
  documents: AssistantDocument[];
  answer: string;
  followUps: string[];
  compareHref: string | null;
  accountRequired: boolean;
  sourceStatus: "current" | "partial";
  canAddToCart: boolean;
}
export interface AssistantTurn {
  id: string;
  question: string;
  answer: string;
  result: AssistantResult;
  createdAt: string;
}
export interface AssistantThread {
  id: string;
  title: string;
  turns: AssistantTurn[];
  updatedAt: string;
}
export interface AssistantMetric {
  id: string;
  question: string;
  category: AssistantCategory;
  at: string;
  resultCount: number;
  member: boolean;
  ai: "used" | "local" | "timeout" | "unavailable";
  latencyMs: number;
  helpful?: boolean;
}
export const assistantQuerySchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    threadId: z.string().uuid().optional(),
    requestId: z.string().uuid(),
    petId: z.string().max(80).optional(),
    history: z
      .array(
        z
          .object({
            question: z.string().max(500),
            productIds: z.array(z.string().max(80)).max(8),
          })
          .strict(),
      )
      .max(4)
      .default([]),
  })
  .strict();
export type AssistantQuery = z.infer<typeof assistantQuerySchema>;

export function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/成份/g, "成分")
    .replace(/貓咪/g, "貓")
    .replace(/狗狗/g, "狗")
    .replace(/帐号|賬號/g, "帳號")
    .replace(/[\s，。？！、,.!?：:「」『』（）()]/g, "");
}
export function searchScore(query: string, text: string) {
  const q = normalizeSearch(query),
    t = normalizeSearch(text);
  if (!q || !t) return 0;
  let score = t.includes(q) ? 20 : 0;
  const terms =
    query.toLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]{2,}/g) ?? [];
  for (const term of terms)
    if (normalizeSearch(term).length > 1 && t.includes(normalizeSearch(term)))
      score += 8;
  const grams = new Set(
    Array.from({ length: Math.max(0, q.length - 1) }, (_, i) =>
      q.slice(i, i + 2),
    ),
  );
  for (const gram of grams) if (t.includes(gram)) score += 1;
  return score;
}
export function assistantDocumentScore(
  query: string,
  doc: AssistantDocument,
  category: AssistantCategory,
) {
  const normalized = normalizeSearch(query);
  const keywords = doc.keywords.split(/\s+/).filter((k) => k.length > 1);
  return (
    searchScore(query, `${doc.title} ${doc.keywords} ${doc.text}`) +
    (doc.category === category ? 3 : 0) +
    keywords.reduce(
      (score, k) => score + (normalized.includes(normalizeSearch(k)) ? 8 : 0),
      0,
    )
  );
}
export function redactAssistantQuestion(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[電子郵件]")
    .replace(/\b(?:09\d{8}|\+?886[-\s]?9\d{8})\b/g, "[電話]")
    .replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, "[編號]")
    .replace(/(?:密碼|password|api.?key|token)\s*[:：=]?\s*\S+/gi, "[隱私內容]")
    .slice(0, 240);
}
export function classifyAssistantQuestion(q: string): AssistantCategory {
  if (/成分|成份|過敏|蛋白|熱量|批次|雞油|雞肉|不含|不吃|避開|比較/.test(q))
    return "ingredients";
  if (/定期|配送|順延|暫停|週期|訂閱/.test(q)) return "autoship";
  if (
    /訂單|收據|物流|票券|折價券|購物券|購物籃|購物車|結帳|刷卡|轉帳|付款|line.?pay|運費|小卡/i.test(
      q,
    )
  )
    return "orders";
  if (
    /點數|幾點|多少點|會員|等級|升等|徽章|簽到|任務|遊戲|轉盤|扭蛋|刮刮|登入|註冊|密碼|驗證|帳戶|地址|收件|通知/.test(
      q,
    )
  )
    return "membership";
  if (/社群|生活圈|問卷|活動|分享|咖啡|公園/.test(q)) return "community";
  if (/我的.*毛孩|我的.*寵物|體重|餵|份量|照顧|換食|存糧/.test(q))
    return "pets";
  if (/在哪|怎麼用|如何|哪裡|共買|家庭|家人|一起買|打包|搜尋|客服|功能/.test(q))
    return "features";
  if (/商品|主食|罐|糧|玩具|胸背|飼料|貓|狗|倉鼠|兔|推薦|多少錢|預算/.test(q))
    return "products";
  return "other";
}
export function buildAssistantAnalytics(
  metrics: AssistantMetric[],
  days: number,
  now = new Date(),
) {
  const start = now.getTime() - (days - 1) * 86400000;
  const rows = metrics.filter(
    (m) =>
      Date.parse(m.at) >= start - 86400000 && Date.parse(m.at) <= now.getTime(),
  );
  const dayKey = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
  const daily = Array.from({ length: days }, (_, i) => ({
    date: dayKey(new Date(now.getTime() - (days - i - 1) * 86400000)),
    count: 0,
  }));
  const valid = rows.filter((m) =>
    daily.some((d) => d.date === dayKey(new Date(m.at))),
  );
  for (const m of valid)
    daily.find((d) => d.date === dayKey(new Date(m.at)))!.count++;
  const top = new Map<
    string,
    { question: string; count: number; category: AssistantCategory }
  >();
  for (const m of valid) {
    const key = normalizeSearch(m.question);
    const old = top.get(key);
    top.set(key, {
      question: m.question,
      count: (old?.count ?? 0) + 1,
      category: m.category,
    });
  }
  return {
    total: valid.length,
    noResults: valid.filter((m) => !m.resultCount).length,
    aiUsed: valid.filter((m) => m.ai === "used").length,
    members: valid.filter((m) => m.member).length,
    avgLatencyMs: valid.length
      ? Math.round(valid.reduce((s, m) => s + m.latencyMs, 0) / valid.length)
      : 0,
    categories: Object.entries(assistantCategories).map(([key, label]) => ({
      key,
      label,
      count: valid.filter((m) => m.category === key).length,
    })),
    daily,
    topQuestions: [...top.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    unanswered: valid.filter((m) => !m.resultCount).slice(0, 40),
    recent: valid.slice(0, 80),
  };
}
