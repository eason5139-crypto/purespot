import { z } from "zod";
import {
  SUPPORT_CATEGORIES,
  type SupportCategory,
  type SupportThread,
} from "./supportTypes";

export const CATEGORY_IDS = [
  "NUTRITION",
  "ALLERGY",
  "AUTOSHIP",
  "ORDER",
  "AFTER_SALES",
  "MEMBERSHIP",
  "GAMES",
  "TECHNICAL",
  "OTHER",
] as const;
const extras = [
  [
    "MEMBERSHIP",
    "會員與點數",
    "等級、點數、票券及帳戶問題",
    "我的點數或票券該怎麼使用？",
  ],
  [
    "GAMES",
    "活動與遊戲",
    "活動參加方式、遊戲結果與獎勵",
    "我想確認這一回合的獎勵紀錄。",
  ],
  [
    "TECHNICAL",
    "網站操作",
    "登入、畫面與操作問題",
    "操作時遇到問題，想請你們協助確認。",
  ],
  [
    "OTHER",
    "其他問題",
    "還找不到合適的分類？從這裡告訴我們",
    "我有其他問題想詢問。",
  ],
] as const;
const categorySchema = z.object({
  id: z.enum(CATEGORY_IDS),
  label: z.string().trim().min(1).max(24),
  description: z.string().trim().max(100),
  prompts: z.array(z.string().trim().min(1).max(160)).max(8),
  templates: z.array(z.string().trim().min(1).max(1500)).max(12),
});
export const supportSettingsSchema = z
  .object({
    categories: z
      .array(categorySchema)
      .length(9)
      .refine(
        (items) => new Set(items.map((c) => c.id)).size === 9,
        "分類不可重複",
      ),
    tags: z.array(z.string().trim().min(1).max(20)).max(30),
  })
  .strict();
export type SupportSettings = z.infer<typeof supportSettingsSchema>;
export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  categories: [
    ...SUPPORT_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.shortLabel,
      description: c.desc,
      prompts: c.quickQuestions,
      templates: [
        "您好，已收到您的問題。我會先核對相關資料，再向您說明處理方式。",
        "這次問題已處理完成，您可以在詢問歷史查看完整回覆；若有其他問題，歡迎另開諮詢。",
      ],
    })),
    ...extras.map(([id, label, description, prompt]) => ({
      id,
      label,
      description,
      prompts: [prompt],
      templates: ["您好，請提供您看到的畫面或操作步驟，我會協助確認這次問題。"],
    })),
  ],
  tags: ["需要回覆", "待買家補充", "訂單確認", "操作問題", "建議改善"],
};
export type BuyerTicket = Omit<
  SupportThread,
  "clientToken" | "internalNotes" | "activity"
>;
export function buyerTicket(t: SupportThread): BuyerTicket {
  return {
    id: t.id,
    source: t.source,
    userId: t.userId,
    buyerName: t.buyerName,
    buyerEmail: t.buyerEmail,
    memberTier: t.memberTier,
    memberTierLabel: t.memberTierLabel,
    tierPriority: t.tierPriority,
    totalSpentNt: t.totalSpentNt,
    ordersCount: t.ordersCount,
    category: t.category,
    subject: t.subject,
    status: t.status,
    orderId: t.orderId,
    petSummary: t.petSummary,
    messages: t.messages,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    resolvedAt: t.resolvedAt,
    firstResponseAt: t.firstResponseAt,
    parentId: t.parentId,
    feedback: t.feedback,
    version: t.version,
  };
}
export const categoryLabel = (
  id: SupportCategory,
  settings = DEFAULT_SUPPORT_SETTINGS,
) => settings.categories.find((c) => c.id === id)?.label ?? "其他問題";
export const dateKey = (date: string) =>
  Number.isFinite(Date.parse(date))
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(date))
    : "";
export const hasUnknownLegacyResponse = (t: SupportThread) =>
  t.source === "ORDER_REQUEST" &&
  !t.firstResponseAt &&
  t.messages.some((m) => m.sender === "ADMIN" && m.id === `${t.id}-m2`);
export const firstSupportResponse = (t: SupportThread) =>
  hasUnknownLegacyResponse(t)
    ? null
    : t.firstResponseAt ||
      t.messages.find((m) => m.sender === "ADMIN")?.createdAt ||
      null;
export function supportStatistics(
  tickets: SupportThread[],
  from: string,
  to: string,
) {
  const inPeriod = (date: string | null | undefined) =>
    !!date && !!dateKey(date) && dateKey(date) >= from && dateKey(date) <= to;
  const cohort = tickets.filter((t) => inPeriod(t.createdAt));
  const closed = tickets.filter(
    (t) => t.status === "RESOLVED" && inPeriod(t.resolvedAt),
  );
  const average = (ns: number[]) =>
    ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
  const response = cohort.flatMap((t) => {
    const first = firstSupportResponse(t);
    const value = first ? Date.parse(first) - Date.parse(t.createdAt) : NaN;
    return value >= 0 ? [value / 60000] : [];
  });
  const resolution = closed.flatMap((t) => {
    const n = Date.parse(t.resolvedAt!) - Date.parse(t.createdAt);
    return n >= 0 ? [n / 60000] : [];
  });
  const ratings = tickets.filter((t) => t.feedback && inPeriod(t.feedback.at));
  const days = [];
  const start = Date.parse(`${from}T00:00:00Z`),
    end = Date.parse(`${to}T00:00:00Z`);
  for (let time = start; time <= end && days.length < 366; time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    days.push({
      day,
      incoming: cohort.filter((t) => dateKey(t.createdAt) === day).length,
      closed: closed.filter((t) => dateKey(t.resolvedAt!) === day).length,
    });
  }
  return {
    total: cohort.length,
    closed: closed.length,
    categories: CATEGORY_IDS.map((id) => ({
      id,
      count: cohort.filter((t) => t.category === id).length,
    })),
    statuses: ["OPEN", "IN_PROGRESS", "RESOLVED"].map((status) => ({
      status,
      count: cohort.filter((t) => t.status === status).length,
    })),
    days,
    firstResponseMinutes: average(response),
    responseSamples: response.length,
    resolutionMinutes: average(resolution),
    resolutionSamples: resolution.length,
    missingResolution: cohort.filter(
      (t) => t.status === "RESOLVED" && !t.resolvedAt,
    ).length,
    rating: average(ratings.map((t) => t.feedback!.score)),
    ratingCount: ratings.length,
  };
}
