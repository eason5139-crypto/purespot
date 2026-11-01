import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";
import { createOrderDraft } from "./orderService";
import { petSchema, type ActivePet } from "@/lib/types";

const intervalSchema = z.union([z.literal(14), z.literal(28), z.literal(42), z.literal(56)]).nullable();

export const experienceOrderSchema = z.object({
  idempotencyKey: z.uuid(),
  paymentMethod: z.enum(["credit", "linepay", "transfer", "cvs"]),
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    pet: petSchema,
    quantity: z.number().int().min(1).max(99),
    intervalDays: intervalSchema,
  })).min(1).max(50),
  shippingAddress: z.object({
    name: z.string().trim().min(1).max(50),
    phone: z.string().regex(/^09\d{8}$/),
    postalCode: z.string().regex(/^\d{3}(\d{2,3})?$/),
    address: z.string().trim().min(5).max(200),
  }),
}).strict();

type ExperienceOrderInput = z.infer<typeof experienceOrderSchema>;

export function isExperienceOrder(paymentReference: string | null) {
  return paymentReference?.startsWith("EXPERIENCE:") ?? false;
}

export function cloudPetId(userId: string, pet: ActivePet) {
  if (pet.cloudId) return pet.cloudId;
  const localPetId = pet.id;
  const hex = createHash("sha256").update(`${userId}:${localPetId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function syncExperiencePets(userId: string, pets: ActivePet[]) {
  for (const pet of pets) {
    const id = cloudPetId(userId, pet);
    const birthday = new Date();
    birthday.setUTCMonth(birthday.getUTCMonth() - pet.ageMonths);
    const existingPet = await db.pet.findUnique({ where: { id }, select: { userId: true, weightKg: true } });
    if (existingPet && existingPet.userId !== userId) throw new ApiError(403, "毛孩資料無法使用");
    if (!existingPet && await db.pet.count({ where: { userId } }) >= 20)
      throw new ApiError(400, "每個帳戶最多建立 20 隻毛孩");
    const data = {
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      birthday,
      weightKg: pet.weightKg,
      isNeutered: pet.isNeutered,
      activityLevel: pet.activityLevel,
      allergies: pet.allergies,
      goal: pet.goal,
    };
    await db.pet.upsert({
      where: { id },
      create: { id, userId, ...data, chronicDiseases: [], weightRecords: { create: { weightKg: pet.weightKg } } },
      update: data,
    });
    if (existingPet && existingPet.weightKg !== pet.weightKg) {
      await db.weightRecord.create({ data: { petId: id, weightKg: pet.weightKg } });
    }
  }
}

export async function createExperienceOrder(userId: string, input: ExperienceOrderInput) {
  const existing = await db.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
  });
  if (existing) {
    if (existing.paymentReference !== `EXPERIENCE:${input.paymentMethod}:${input.idempotencyKey}`)
      throw new ApiError(409, "訂單識別碼已使用");
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const variants = await db.productVariant.findMany({
    where: { productId: { in: productIds } },
    include: { product: true },
    orderBy: { sku: "asc" },
  });
  const variantByProduct = new Map<string, (typeof variants)[number]>();
  for (const variant of variants) {
    if (!variantByProduct.has(variant.productId)) variantByProduct.set(variant.productId, variant);
  }
  for (const productId of productIds) {
    const variant = variantByProduct.get(productId);
    if (!variant?.product.isPublished) throw new ApiError(409, "商品已下架，請更新購物車");
  }

  const pets = [...new Map(input.items.map((item) => [item.pet.id, item.pet])).values()];
  await syncExperiencePets(userId, pets);

  return createOrderDraft(userId, {
    idempotencyKey: input.idempotencyKey,
    items: input.items.map((item) => ({
      variantId: variantByProduct.get(item.productId)!.id,
      petId: cloudPetId(userId, item.pet),
      quantity: item.quantity,
      intervalDays: item.intervalDays,
    })),
    shippingAddress: input.shippingAddress,
  }, { paymentReference: `EXPERIENCE:${input.paymentMethod}:${input.idempotencyKey}` });
}
