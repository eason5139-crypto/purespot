import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { Product } from "@/lib/types";

const productInclude = {
  category: true,
  variants: true,
  batches: { orderBy: { testedAt: "asc" as const } },
} satisfies Prisma.ProductInclude;

type DatabaseProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export function toCatalogProduct(record: DatabaseProduct): Product {
  const analysis = (record.guaranteedAnalysis ?? {}) as Record<string, unknown>;
  const variant = record.variants[0];
  const gallery = Array.isArray(analysis.gallery)
    ? analysis.gallery.filter((value): value is string => typeof value === "string")
    : [];
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    subtitle: record.brief,
    type: record.targetPetType,
    category: record.category.name,
    lifeStages: record.lifeStages.filter(
      (value): value is Product["lifeStages"][number] =>
        value === "JUNIOR" || value === "ADULT" || value === "SENIOR",
    ),
    ingredients: record.ingredientsText.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
    allergens: record.allergens,
    kcalPer100g: Number(analysis.kcalPer100g ?? 380),
    bagGrams: variant?.bagGrams ?? 1000,
    priceNt: variant?.priceNt ?? 0,
    stock: variant?.stock ?? 0,
    image: record.imageUrl,
    gallery,
    videoUrl: typeof analysis.videoUrl === "string" ? analysis.videoUrl : undefined,
    color: analysis.color === "amber" || analysis.color === "blue" ? analysis.color : "cyan",
    proteinMin: Number(analysis.proteinMin ?? 0),
    moistureMax: Number(analysis.moistureMax ?? 0),
    ashMax: Number(analysis.ashMax ?? 0),
    batches: record.batches.map((batch) => ({
      date: batch.testedAt.toISOString().slice(0, 10),
      batch: batch.batch,
      protein: batch.protein,
      moisture: batch.moisture,
      ash: batch.ash,
    })),
    autoshipEligible: record.isAutoshipEligible,
    description: record.description,
    isPublished: record.isPublished,
  };
}

export async function getCatalogProducts(includeDrafts = false): Promise<Product[]> {
  const records = await db.product.findMany({
    where: includeDrafts ? undefined : { isPublished: true },
    include: productInclude,
    orderBy: { createdAt: "asc" },
  });
  return records.map(toCatalogProduct);
}
