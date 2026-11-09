-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "costReferenceUrl" TEXT,
ADD COLUMN     "costSource" TEXT,
ADD COLUMN     "costUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "unitCostNt" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "unitCostNt" INTEGER,
ADD COLUMN     "unitCostSource" TEXT;

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "unitCostNt" INTEGER,
    "costImpactNt" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_type_idx" ON "StockMovement"("createdAt", "type");

-- CreateIndex
CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_batchId_idx" ON "StockMovement"("batchId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Planning estimates for the existing catalog. These are not supplier invoices.
UPDATE "ProductVariant" AS v
SET "unitCostNt" = GREATEST(1, ROUND(v."priceNt" * CASE c."name"
  WHEN '主食乾糧' THEN 0.36 WHEN '主食罐頭' THEN 0.45 WHEN '鮮食餐包' THEN 0.48
  WHEN '凍乾主食' THEN 0.50 WHEN '風乾主食' THEN 0.46 WHEN '機能配方' THEN 0.42
  WHEN '小動物主食' THEN 0.38 WHEN '零食點心' THEN 0.43 WHEN '玩具互動' THEN 0.40
  WHEN '居家用品' THEN 0.45 WHEN '清潔照護' THEN 0.42 WHEN '外出用品' THEN 0.47
  WHEN '飲水餐具' THEN 0.44 WHEN '舒壓嗅聞' THEN 0.43 WHEN '戶外安全' THEN 0.47
  WHEN '日常保養' THEN 0.44 ELSE 0.43 END)::integer),
  "costSource" = 'ESTIMATE',
  "costReferenceUrl" = CASE
    WHEN c."name" IN ('凍乾主食','風乾主食') THEN 'https://www.alibaba.com/product-introduction/Wholesale-Bulk-Freeze-Dried-Dog-Treats_1601288478391.html'
    WHEN c."name" IN ('主食乾糧','主食罐頭','鮮食餐包','機能配方','小動物主食','零食點心') THEN 'https://www.alibaba.com/product-detail/Wholesale-Direct-Sale-Private-Label-High_1601023199909.html'
    ELSE 'https://www.kaojing-pet.com/products/index.php?group_id=7206' END,
  "costUpdatedAt" = CURRENT_TIMESTAMP
FROM "Product" AS p JOIN "Category" AS c ON c."id" = p."categoryId"
WHERE p."id" = v."productId" AND v."unitCostNt" IS NULL;

-- Replace only legacy catalog illustrations; preserve merchant-selected images.
UPDATE "Product"
SET "imageUrl" = regexp_replace(replace("imageUrl", '/images/products/', '/images/products-photo/'), '\.svg$', '.webp')
WHERE "imageUrl" LIKE '/images/products/%.svg';

