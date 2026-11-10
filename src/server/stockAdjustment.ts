import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";

export const stockAdjustmentInputSchema = z.object({
  delta: z.number().int().min(-100000).max(100000).refine((value) => value !== 0),
  type: z.enum(["restock", "adjustment", "deduction"]),
  note: z.string().trim().max(200).default(""),
}).strict();

export const stockLineSchema = stockAdjustmentInputSchema.extend({
  productId: z.string().min(1).max(100),
}).superRefine((line, context) => {
  if (line.type === "restock" && line.delta < 0) context.addIssue({ code: "custom", path: ["delta"], message: "入庫數量必須為正數" });
  if (line.type === "deduction" && line.delta > 0) context.addIssue({ code: "custom", path: ["delta"], message: "耗損數量必須為負數" });
  if (line.type !== "restock" && !line.note) context.addIssue({ code: "custom", path: ["note"], message: "校正或耗損請填寫原因" });
});

export type StockLine = z.infer<typeof stockLineSchema>;

export async function adjustStock(lines: StockLine[]) {
  if (!lines.length || lines.length > 80 || new Set(lines.map((line) => line.productId)).size !== lines.length) throw new ApiError(400, "請選擇 1 至 80 款不重複商品");
  const validLines = lines.map((line) => stockLineSchema.parse(line));
  const batchId = randomUUID();
  return db.$transaction(async (tx) => {
    const result = [];
    const variants = await tx.productVariant.findMany({
      where: { productId: { in: validLines.map((line) => line.productId) } },
      orderBy: { sku: "asc" },
    });
    const variantByProduct = new Map<string, (typeof variants)[number]>();
    for (const variant of variants) {
      if (!variantByProduct.has(variant.productId)) variantByProduct.set(variant.productId, variant);
    }
    for (const line of validLines) {
      const variant = variantByProduct.get(line.productId);
      if (!variant) throw new ApiError(404, "找不到商品規格");
      if (variant.unitCostNt === null) throw new ApiError(400, "商品尚未設定進貨單價，請先編輯商品成本");
      const newStock = variant.stock + line.delta;
      if (newStock < 0) throw new ApiError(400, "扣除數量不可超過現有庫存");
      const changed = await tx.productVariant.updateMany({ where: { id: variant.id, stock: variant.stock }, data: { stock: newStock } });
      if (changed.count !== 1) throw new ApiError(409, "庫存已被其他操作更新，請重新整理後再試");
      const costImpactNt = line.delta > 0 && line.type !== "restock" ? 0 : Math.abs(line.delta) * variant.unitCostNt;
      const movement = await tx.stockMovement.create({ data: {
        variantId: variant.id, type: line.type.toUpperCase(), delta: line.delta,
        stockBefore: variant.stock, stockAfter: newStock, unitCostNt: variant.unitCostNt,
        costImpactNt, note: line.note, batchId,
      } });
      if (newStock === 0) await tx.favorite.updateMany({ where: { productId: line.productId, watchRestock: true }, data: { savedOutOfStock: true } });
      result.push({ productId: line.productId, stock: newStock, movement });
    }
    return { batchId, items: result, estimatedTotalNt: result.reduce((sum, item) => sum + (item.movement.costImpactNt ?? 0), 0) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 45000 });
}

export function startOfTaipeiMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return new Date(Date.UTC(year, month - 1, 1) - 8 * 3600000);
}

export async function inventorySpending() {
  const movements = await db.stockMovement.findMany({ where: { createdAt: { gte: startOfTaipeiMonth() } }, select: { type: true, delta: true, costImpactNt: true } });
  const procurementNt = movements.filter((entry) => entry.type === "RESTOCK").reduce((sum, entry) => sum + (entry.costImpactNt ?? 0), 0);
  const lossNt = movements.filter((entry) => entry.type === "DEDUCTION" || (entry.type === "ADJUSTMENT" && entry.delta < 0)).reduce((sum, entry) => sum + (entry.costImpactNt ?? 0), 0);
  return { procurementNt, lossNt, totalNt: procurementNt + lossNt, missingCostMovements: movements.filter((entry) => entry.costImpactNt === null).length };
}
