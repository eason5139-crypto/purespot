import { z } from "zod";
import { mediaUrlSchema } from "./mediaUrl";

export const adminProductInputSchema = z.object({
  name: z.string().trim().min(2, "商品名稱至少 2 個字").max(60),
  subtitle: z.string().trim().min(2, "副標題至少 2 個字").max(100),
  type: z.enum(["CAT", "DOG", "HAMSTER", "RABBIT"]),
  kind: z.enum(["FOOD", "SUPPLIES"]).default("FOOD"),
  category: z.string().min(1, "請選擇分類"),
  priceNt: z.number().int().min(1, "售價需大於 0"),
  stock: z.number().int().min(0, "庫存不可為負數"),
  bagGrams: z.number().int().min(1, "規格重量需大於 0"),
  kcalPer100g: z.number().min(0).max(800),
  proteinMin: z.number().min(0).max(99),
  moistureMax: z.number().min(0).max(90),
  ashMax: z.number().min(0).max(30),
  image: mediaUrlSchema,
  gallery: z.array(mediaUrlSchema).max(8).default([]),
  videoUrl: z.string().url("請輸入有效影片網址").optional().or(z.literal("")),
  description: z.string().min(10, "商品描述至少 10 個字"),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()).default([]),
  lifeStages: z.array(z.enum(["JUNIOR", "ADULT", "SENIOR"])).min(1, "至少選擇一個生命階段"),
  autoshipEligible: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  color: z.enum(["cyan", "amber", "blue"]).default("cyan"),
}).superRefine((value, context) => {
  if (value.kind !== "FOOD" || (value.type !== "CAT" && value.type !== "DOG")) return;
  if (!value.ingredients.length) context.addIssue({ code: "custom", path: ["ingredients"], message: "食品至少填寫一項主要成分" });
  for (const key of ["kcalPer100g", "proteinMin", "moistureMax", "ashMax"] as const) {
    if (value[key] <= 0) context.addIssue({ code: "custom", path: [key], message: "食品需填寫實際營養數值" });
  }
});

export type AdminProductInput = z.infer<typeof adminProductInputSchema>;

export interface RevenueMetric {
  todayRevenueNt: number;
  weekRevenueNt: number;
  monthRevenueNt: number;
  totalRevenueNt: number;
  todayOrdersCount: number;
  weekOrdersCount: number;
  monthOrdersCount: number;
  totalOrdersCount: number;
  averageOrderValueNt: number; // 客單價 (AOV)
  repeatPurchaseRate: number; // 回購率 (%)
  autoshipRatio: number; // 定期配營收佔比 (%)
}

export interface SalesHistoryPoint {
  date: string; // YYYY-MM-DD
  revenueNt: number;
  ordersCount: number;
}
