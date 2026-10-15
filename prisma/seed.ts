import { PrismaClient } from "@prisma/client";
import { products } from "../src/lib/catalog";
const prisma = new PrismaClient();
const FOOD_CATEGORY_ID = "00000000-0000-0000-0000-000000000001";
async function seed() {
  // 使用固定 UUID 保持冪等性，避免每次 seed 產生新 category
  const category = await prisma.category.upsert({
    where: { id: FOOD_CATEGORY_ID },
    create: { id: FOOD_CATEGORY_ID, name: "主食乾糧" },
    update: {},
  });
  for (const p of products) {
    const data = {
      name: p.name,
      slug: p.slug,
      targetPetType: p.type,
      brief: p.subtitle,
      description: p.description,
      ingredientsText: p.ingredients.join("、"),
      allergens: p.allergens,
      lifeStages: p.lifeStages,
      guaranteedAnalysis: {
        kcalPer100g: p.kcalPer100g,
        proteinMin: p.proteinMin,
        moistureMax: p.moistureMax,
        ashMax: p.ashMax,
      },
      imageUrl: p.image,
      isPublished: true,
      categoryId: category.id,
      isAutoshipEligible: p.autoshipEligible,
    };
    await prisma.product.upsert({
      where: { id: p.id },
      create: { id: p.id, ...data },
      update: data,
    });
    // 重複執行種子資料不重設營運庫存與售價。
    await prisma.productVariant.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        productId: p.id,
        sku: `PS-${p.id}`,
        label: `${p.bagGrams} 克`,
        bagGrams: p.bagGrams,
        priceNt: p.priceNt,
        stock: p.stock,
      },
      update: {},
    });
    for (const b of p.batches) {
      await prisma.batchReport.upsert({
        where: { productId_batch: { productId: p.id, batch: b.batch } },
        create: {
          productId: p.id,
          batch: b.batch,
          testedAt: new Date(b.date),
          protein: b.protein,
          moisture: b.moisture,
          ash: b.ash,
          isDemo: true,
        },
        update: {},
      });
    }
  }
  console.info("PURESPOT 示範商品與批次資料已建立");
}
seed()
  .catch(() => {
    console.error("種子資料建立失敗，請確認資料庫連線與結構");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
