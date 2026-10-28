import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { getCatalogProducts } from "@/server/productCatalog";
import { readBody, apiError, verifyOrigin, ApiError } from "@/server/http";
import { requireAdminSession } from "@/server/adminAuth";
import { adminProductInputSchema, type AdminProductInput } from "@/lib/adminTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getCategoryId(name: string) {
  const existing = await db.category.findFirst({ where: { name } });
  if (existing) return existing.id;
  return (await db.category.create({ data: { name } })).id;
}

function productData(input: AdminProductInput, categoryId: string) {
  return {
    name: input.name,
    brief: input.subtitle,
    description: input.description,
    targetPetType: input.type,
    categoryId,
    ingredientsText: input.ingredients.join("、"),
    allergens: input.allergens,
    lifeStages: input.lifeStages,
    guaranteedAnalysis: {
      kcalPer100g: input.kcalPer100g,
      proteinMin: input.proteinMin,
      moistureMax: input.moistureMax,
      ashMax: input.ashMax,
      gallery: input.gallery,
      videoUrl: input.videoUrl || null,
      color: input.color,
    },
    imageUrl: input.image,
    isPublished: input.isPublished,
    isAutoshipEligible: input.autoshipEligible,
  };
}

export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(
      { products: await getCatalogProducts(true) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const input = await readBody(request, adminProductInputSchema);
    const id = randomUUID();
    const slug = `product-${id.slice(0, 8)}`;
    const categoryId = await getCategoryId(input.category);
    await db.product.create({
      data: {
        id,
        slug,
        ...productData(input, categoryId),
        variants: {
          create: {
            sku: `PS-${id.slice(0, 8).toUpperCase()}`,
            label: `${input.bagGrams} 克`,
            bagGrams: input.bagGrams,
            priceNt: input.priceNt,
            stock: input.stock,
          },
        },
      },
    });
    return NextResponse.json({ product: (await getCatalogProducts(true)).find((p) => p.id === id) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const input = await readBody(
      request,
      adminProductInputSchema.extend({ id: z.string().min(1).max(100) }).strict(),
    );
    const id = String(input.id);
    const existing = await db.product.findUnique({ where: { id }, include: { variants: true } });
    if (!existing) throw new ApiError(404, "找不到商品");
    const categoryId = await getCategoryId(input.category);
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: productData(input, categoryId) });
      const variant = existing.variants[0];
      if (variant) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            label: `${input.bagGrams} 克`,
            bagGrams: input.bagGrams,
            priceNt: input.priceNt,
            stock: input.stock,
          },
        });
      } else {
        await tx.productVariant.create({
          data: {
            productId: id,
            sku: `PS-${id.slice(0, 8).toUpperCase()}`,
            label: `${input.bagGrams} 克`,
            bagGrams: input.bagGrams,
            priceNt: input.priceNt,
            stock: input.stock,
          },
        });
      }
    });
    return NextResponse.json({ product: (await getCatalogProducts(true)).find((p) => p.id === id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new ApiError(400, "缺少商品 ID");
    await db.product.update({ where: { id }, data: { isPublished: false } });
    return NextResponse.json({ success: true, id, status: "draft" });
  } catch (error) {
    return apiError(error);
  }
}
