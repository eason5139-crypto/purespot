import { PrismaClient } from "@prisma/client";
import { products } from "../src/lib/catalog";

const prisma = new PrismaClient();

async function seed() {
  const categoryIds = new Map<string, string>();
  const names = [...new Set(products.map((product) => product.category))];

  for (const [index, name] of names.entries()) {
    const existing = await prisma.category.findFirst({ where: { name } });
    const category = existing ?? await prisma.category.create({
      data: { id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`, name },
    });
    categoryIds.set(name, category.id);
  }

  let created = 0;
  for (const product of products) {
    // 已有商品可能由後台修改過：重新執行時不得覆蓋名稱、價格、圖片或庫存。
    if (await prisma.product.findUnique({ where: { id: product.id }, select: { id: true } })) continue;
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`缺少分類：${product.category}`);

    await prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        targetPetType: product.type,
        brief: product.subtitle,
        description: product.description,
        ingredientsText: product.ingredients.join("、"),
        allergens: product.allergens,
        lifeStages: product.lifeStages,
        guaranteedAnalysis: {
          kcalPer100g: product.kcalPer100g,
          proteinMin: product.proteinMin,
          moistureMax: product.moistureMax,
          ashMax: product.ashMax,
          color: product.color,
        },
        imageUrl: product.image,
        isPublished: true,
        categoryId,
        isAutoshipEligible: product.autoshipEligible,
        variants: {
          create: {
            sku: `PS-${product.id}`,
            label: `${product.bagGrams} 克`,
            bagGrams: product.bagGrams,
            priceNt: product.priceNt,
            stock: product.stock,
          },
        },
        batches: {
          create: product.batches.map((batch) => ({
            batch: batch.batch,
            testedAt: new Date(batch.date),
            protein: batch.protein,
            moisture: batch.moisture,
            ash: batch.ash,
            isDemo: true,
          })),
        },
      },
    });
    created += 1;
  }
  console.info(`PURESPOT 展示商品：新增 ${created} 款，現有商品保持原樣`);
}

seed()
  .catch((error) => {
    console.error("展示商品建立失敗", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
