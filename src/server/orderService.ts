import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";
export const orderInputSchema = z
  .object({
    idempotencyKey: z.uuid(),
    items: z
      .array(
        z.object({
          variantId: z.string().min(1).max(100),
          petId: z.uuid(),
          quantity: z.number().int().min(1).max(99),
          intervalDays: z
            .union([z.literal(14), z.literal(28), z.literal(42), z.literal(56)])
            .nullable(),
        }),
      )
      .min(1)
      .max(50),
    shippingAddress: z.object({
      name: z.string().trim().min(1).max(50),
      phone: z.string().regex(/^09\d{8}$/),
      postalCode: z.string().regex(/^\d{3}(\d{2,3})?$/),
      address: z.string().trim().min(5).max(200),
    }),
  })
  .strict();
export async function createOrderDraft(
  userId: string,
  input: z.infer<typeof orderInputSchema>,
) {
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        items: input.items,
        shippingAddress: input.shippingAddress,
      }),
    )
    .digest("hex");
  const existing = await db.order.findUnique({
    where: {
      userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey },
    },
  });
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new ApiError(409, "重試識別碼與訂單內容不一致");
    return existing;
  }
  return db.$transaction(
    async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: input.items.map((i) => i.variantId) } },
        include: { product: true },
      });
      const pets = await tx.pet.findMany({
        where: { id: { in: input.items.map((i) => i.petId) }, userId },
      });
      const demand = new Map<string, number>();
      const keys = new Set<string>();
      const lines = input.items.map((item) => {
        const key = `${item.variantId}:${item.petId}:${item.intervalDays ?? 0}`;
        if (keys.has(key)) throw new ApiError(400, "請合併重複的商品項目");
        keys.add(key);
        const variant = variants.find((v) => v.id === item.variantId);
        const pet = pets.find((p) => p.id === item.petId);
        if (!variant || !variant.product.isPublished || !pet)
          throw new ApiError(400, "商品或毛孩資料無法使用");
        const p = variant.product;
        const ageMonths =
          (new Date().getUTCFullYear() - pet.birthday.getUTCFullYear()) * 12 +
          new Date().getUTCMonth() -
          pet.birthday.getUTCMonth();
        const stage =
          ageMonths < 12 ? "JUNIOR" : ageMonths >= 84 ? "SENIOR" : "ADULT";
        if (
          p.targetPetType !== pet.type ||
          !p.lifeStages.includes(stage) ||
          pet.allergies.some((a) => p.allergens.includes(a))
        )
          throw new ApiError(400, "商品不適合此毛孩，請重新選擇");
        if (item.intervalDays && !p.isAutoshipEligible)
          throw new ApiError(400, "此商品不支援循環補貨");
        const qty = (demand.get(variant.id) ?? 0) + item.quantity;
        demand.set(variant.id, qty);
        if (qty > variant.stock)
          throw new ApiError(409, "商品庫存不足，請調整數量");
        const unitPriceNt = item.intervalDays
          ? new Prisma.Decimal(variant.priceNt)
              .mul(p.autoshipDiscountRate)
              .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
              .toNumber()
          : variant.priceNt;
        return {
          variantId: variant.id,
          petId: pet.id,
          productName: p.name,
          quantity: item.quantity,
          unitPriceNt,
          isAutoship: !!item.intervalDays,
          intervalDays: item.intervalDays,
        };
      });
      const subtotalNt = lines.reduce(
        (s, i) => s + i.unitPriceNt * i.quantity,
        0,
      );
      const threshold = lines.every((i) => i.isAutoship) ? 699 : 999;
      const shippingNt = subtotalNt >= threshold ? 0 : 80;
      // 草稿不扣庫存、不建立已付款狀態；付款介接必須先完成原子庫存保留與回呼驗證。
      return tx.order.create({
        data: {
          userId,
          idempotencyKey: input.idempotencyKey,
          requestHash,
          subtotalNt,
          shippingNt,
          totalNt: subtotalNt + shippingNt,
          shippingAddress: input.shippingAddress,
          expiresAt: new Date(Date.now() + 30 * 60_000),
          items: { create: lines },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
