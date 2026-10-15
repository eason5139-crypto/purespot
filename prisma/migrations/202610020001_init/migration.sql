-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- 建立列舉
CREATE TYPE "PetType" AS ENUM ('DOG', 'CAT');

-- 建立列舉
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'MODERATE', 'HIGH', 'ATHLETIC');

-- 建立列舉
CREATE TYPE "AutoshipFrequency" AS ENUM ('EVERY_2_WEEKS', 'EVERY_4_WEEKS', 'EVERY_6_WEEKS', 'EVERY_8_WEEKS');

-- 建立列舉
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- 建立列舉
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED');

-- 建立資料表
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PetType" NOT NULL,
    "breed" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT '未提供',
    "isNeutered" BOOLEAN NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "bodyConditionScore" INTEGER NOT NULL DEFAULT 5,
    "activityLevel" "ActivityLevel" NOT NULL,
    "allergies" TEXT[],
    "chronicDiseases" TEXT[],
    "goal" TEXT NOT NULL DEFAULT 'MAINTAIN',
    "avatarUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "WeightRecord" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightRecord_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetPetType" "PetType" NOT NULL,
    "brief" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ingredientsText" TEXT NOT NULL,
    "allergens" TEXT[],
    "lifeStages" TEXT[],
    "guaranteedAnalysis" JSONB NOT NULL,
    "transparencyReportUrl" TEXT,
    "imageUrl" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isAutoshipEligible" BOOLEAN NOT NULL DEFAULT true,
    "autoshipDiscountRate" DECIMAL(4,2) NOT NULL DEFAULT 0.90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bagGrams" INTEGER NOT NULL,
    "priceNt" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "BatchReport" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "moisture" DOUBLE PRECISION NOT NULL,
    "ash" DOUBLE PRECISION NOT NULL,
    "reportUrl" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BatchReport_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotalNt" INTEGER NOT NULL,
    "shippingNt" INTEGER NOT NULL,
    "totalNt" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "paymentReference" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPriceNt" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isAutoship" BOOLEAN NOT NULL DEFAULT false,
    "intervalDays" INTEGER,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "AutoshipPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frequency" "AutoshipFrequency" NOT NULL,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "paymentMethodToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoshipPlan_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "AutoshipItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "AutoshipItem_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "petSnapshot" JSONB NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- 建立資料表
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- 建立索引
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- 建立索引
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- 建立索引
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- 建立索引
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

-- 建立索引
CREATE INDEX "WeightRecord_petId_recordedAt_idx" ON "WeightRecord"("petId", "recordedAt");

-- 建立索引
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- 建立索引
CREATE INDEX "Product_targetPetType_isPublished_idx" ON "Product"("targetPetType", "isPublished");

-- 建立索引
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- 建立索引
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- 建立索引
CREATE INDEX "BatchReport_productId_testedAt_idx" ON "BatchReport"("productId", "testedAt");

-- 建立索引
CREATE UNIQUE INDEX "BatchReport_productId_batch_key" ON "BatchReport"("productId", "batch");

-- 建立索引
CREATE UNIQUE INDEX "Order_paymentReference_key" ON "Order"("paymentReference");

-- 建立索引
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- 建立索引
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");

-- 建立索引
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");

-- 建立索引
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- 建立索引
CREATE INDEX "OrderItem_petId_idx" ON "OrderItem"("petId");

-- 建立索引
CREATE INDEX "AutoshipPlan_userId_nextBillingDate_idx" ON "AutoshipPlan"("userId", "nextBillingDate");

-- 建立索引
CREATE INDEX "AutoshipPlan_status_nextBillingDate_idx" ON "AutoshipPlan"("status", "nextBillingDate");

-- 建立索引
CREATE UNIQUE INDEX "AutoshipItem_planId_variantId_petId_key" ON "AutoshipItem"("planId", "variantId", "petId");

-- 建立索引
CREATE INDEX "Review_productId_isApproved_createdAt_idx" ON "Review"("productId", "isApproved", "createdAt");

-- 建立索引
CREATE UNIQUE INDEX "OutboxEvent_dedupeKey_key" ON "OutboxEvent"("dedupeKey");

-- 建立索引
CREATE INDEX "OutboxEvent_processedAt_availableAt_idx" ON "OutboxEvent"("processedAt", "availableAt");

-- 建立外鍵
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "WeightRecord" ADD CONSTRAINT "WeightRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "BatchReport" ADD CONSTRAINT "BatchReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "AutoshipPlan" ADD CONSTRAINT "AutoshipPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "AutoshipItem" ADD CONSTRAINT "AutoshipItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AutoshipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "AutoshipItem" ADD CONSTRAINT "AutoshipItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "AutoshipItem" ADD CONSTRAINT "AutoshipItem_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 建立外鍵
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 基礎金額、庫存與健康資料檢查。
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_weight_check" CHECK ("weightKg" >= 0.5 AND "weightKg" <= 90);
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_bcs_check" CHECK ("bodyConditionScore" BETWEEN 1 AND 9);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "Variant_positive_check" CHECK ("bagGrams" > 0 AND "priceNt" > 0 AND "stock" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_totals_check" CHECK ("subtotalNt" >= 0 AND "shippingNt" >= 0 AND "totalNt" = "subtotalNt" + "shippingNt");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_values_check" CHECK ("quantity" BETWEEN 1 AND 99 AND "unitPriceNt" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cycle_check" CHECK (("isAutoship" = false AND "intervalDays" IS NULL) OR ("isAutoship" = true AND "intervalDays" IS NOT NULL AND "intervalDays" IN (14,28,42,56)));
ALTER TABLE "AutoshipItem" ADD CONSTRAINT "AutoshipItem_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Product" ADD CONSTRAINT "Product_discount_check" CHECK ("autoshipDiscountRate" > 0 AND "autoshipDiscountRate" <= 1);
