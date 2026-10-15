import { z } from "zod";

export const adminProductInputSchema = z.object({
  name: z.string().trim().min(2, "商品名稱至少 2 個字").max(60),
  subtitle: z.string().trim().min(2, "副標題至少 2 個字").max(100),
  type: z.enum(["CAT", "DOG"]),
  category: z.string().min(1, "請選擇分類"),
  priceNt: z.number().int().min(1, "售價需大於 0"),
  stock: z.number().int().min(0, "庫存不可為負數"),
  bagGrams: z.number().int().min(10, "規格公克數需大於 10"),
  kcalPer100g: z.number().min(50).max(800),
  proteinMin: z.number().min(1).max(99),
  moistureMax: z.number().min(1).max(90),
  ashMax: z.number().min(1).max(30),
  image: z.string().min(1, "請輸入或上傳圖片網址"),
  videoUrl: z.string().url("請輸入有效影片網址").optional().or(z.literal("")),
  description: z.string().min(10, "商品描述至少 10 個字"),
  ingredients: z.array(z.string()).min(1, "至少填寫一項主要成分"),
  allergens: z.array(z.string()).default([]),
  lifeStages: z.array(z.enum(["JUNIOR", "ADULT", "SENIOR"])).min(1, "至少選擇一個生命階段"),
  autoshipEligible: z.boolean().default(true),
  color: z.enum(["cyan", "amber", "blue"]).default("cyan"),
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
