import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { readBody, apiError } from "@/server/http";
import { adminProductInputSchema } from "@/lib/adminTypes";
import { products as defaultProducts } from "@/lib/catalog";

export const runtime = "nodejs";

// 記憶體中暫存（支援展示模式下即時新增、刪除、編輯）
let customProducts = [...defaultProducts];

export async function GET() {
  try {
    const dbProducts = await db.product.findMany({
      include: {
        variants: true,
        batches: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (dbProducts.length > 0) {
      return NextResponse.json({ products: dbProducts, source: "database" });
    }
  } catch {
    // 降級使用展示資料庫
  }

  return NextResponse.json({ products: customProducts, source: "memory_demo" });
}

export async function POST(request: Request) {
  try {
    const input = await readBody(request, adminProductInputSchema);
    const slug = `${input.type.toLowerCase()}-${Date.now().toString(36)}`;
    const newId = `prod-${Date.now()}`;

    const newProduct = {
      id: newId,
      slug,
      name: input.name,
      subtitle: input.subtitle,
      type: input.type,
      category: input.category,
      lifeStages: input.lifeStages,
      ingredients: input.ingredients,
      allergens: input.allergens,
      kcalPer100g: input.kcalPer100g,
      bagGrams: input.bagGrams,
      priceNt: input.priceNt,
      stock: input.stock,
      image: input.image,
      videoUrl: input.videoUrl || undefined,
      color: input.color,
      proteinMin: input.proteinMin,
      moistureMax: input.moistureMax,
      ashMax: input.ashMax,
      batches: [
        {
          date: new Date().toISOString().slice(0, 10),
          batch: `PS-${Date.now().toString(36).toUpperCase()}`,
          protein: input.proteinMin + 0.5,
          moisture: input.moistureMax - 0.2,
          ash: input.ashMax - 0.3,
        },
      ],
      autoshipEligible: input.autoshipEligible,
      description: input.description,
    };

    // 嘗試寫入資料庫
    try {
      const created = await db.product.create({
        data: {
          id: newId,
          slug,
          name: input.name,
          brief: input.subtitle,
          description: input.description,
          targetPetType: input.type,
          categoryId: "cat-general", // 預設類別
          ingredientsText: input.ingredients.join("、"),
          allergens: input.allergens,
          lifeStages: input.lifeStages,
          guaranteedAnalysis: {
            proteinMin: input.proteinMin,
            moistureMax: input.moistureMax,
            ashMax: input.ashMax,
          },
          imageUrl: input.image,
          isPublished: true,
          isAutoshipEligible: input.autoshipEligible,
          variants: {
            create: {
              sku: `SKU-${slug}`,
              label: `${input.bagGrams}g`,
              bagGrams: input.bagGrams,
              priceNt: input.priceNt,
              stock: input.stock,
            },
          },
        },
      });
      return NextResponse.json({ success: true, product: created }, { status: 201 });
    } catch {
      // 降級存入記憶體
      customProducts = [newProduct, ...customProducts];
      return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
    }
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少商品 ID" }, { status: 400 });
    }

    try {
      await db.product.delete({ where: { id } });
    } catch {
      // 記憶體中移除
      customProducts = customProducts.filter((p) => p.id !== id);
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (e) {
    return apiError(e);
  }
}
