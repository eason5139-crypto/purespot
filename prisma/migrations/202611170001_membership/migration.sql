-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "demoConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discountNt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "familyGroupId" TEXT,
ADD COLUMN     "giftCard" JSONB;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_totals_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_totals_check"
CHECK ("subtotalNt" >= 0 AND "shippingNt" >= 0 AND "discountNt" >= 0
  AND "discountNt" <= "subtotalNt" AND "totalNt" = "subtotalNt" + "shippingNt" - "discountNt");

-- CreateTable
CREATE TABLE "MembershipConfig" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "silverSpendNt" INTEGER NOT NULL DEFAULT 3000,
    "goldSpendNt" INTEGER NOT NULL DEFAULT 12000,
    "pointsPerHundred" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberMission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "badgeTitle" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MemberMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "discountNt" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "discountNt" INTEGER NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMemberRecord" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMemberRecord_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FamilyListItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "petId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT NOT NULL DEFAULT '',
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthMoment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "careRecordId" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthMoment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PointEntry_sourceKey_key" ON "PointEntry"("sourceKey");

-- CreateIndex
CREATE INDEX "PointEntry_userId_createdAt_idx" ON "PointEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_code_key" ON "RewardRedemption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_orderId_key" ON "RewardRedemption"("orderId");

-- CreateIndex
CREATE INDEX "RewardRedemption_userId_orderId_idx" ON "RewardRedemption"("userId", "orderId");

-- CreateIndex
CREATE INDEX "MemberNotification_userId_readAt_createdAt_idx" ON "MemberNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AccountToken_userId_kind_expiresAt_idx" ON "AccountToken"("userId", "kind", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyGroup_inviteCode_key" ON "FamilyGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "FamilyMemberRecord_groupId_role_idx" ON "FamilyMemberRecord"("groupId", "role");

-- CreateIndex
CREATE INDEX "FamilyListItem_groupId_createdAt_idx" ON "FamilyListItem"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthMoment_careRecordId_key" ON "GrowthMoment"("careRecordId");

-- CreateIndex
CREATE INDEX "GrowthMoment_userId_petId_createdAt_idx" ON "GrowthMoment"("userId", "petId", "createdAt");

-- AddForeignKey
ALTER TABLE "PointEntry" ADD CONSTRAINT "PointEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberNotification" ADD CONSTRAINT "MemberNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMemberRecord" ADD CONSTRAINT "FamilyMemberRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMemberRecord" ADD CONSTRAINT "FamilyMemberRecord_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyListItem" ADD CONSTRAINT "FamilyListItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMoment" ADD CONSTRAINT "GrowthMoment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMoment" ADD CONSTRAINT "GrowthMoment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MembershipConfig" ("id", "silverSpendNt", "goldSpendNt", "pointsPerHundred", "updatedAt")
VALUES ('main', 3000, 12000, 1, NOW()) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MemberMission" ("id", "title", "badgeTitle", "points", "isActive") VALUES
 ('pet', '建立毛孩檔案', '毛孩相識', 10, true),
 ('care', '記錄照顧日常', '日常記錄家', 10, true),
 ('favorite', '收藏第一件商品', '選物收藏家', 10, true),
 ('family', '和家人一起照顧', '一起照顧', 10, true),
 ('community', '分享第一篇毛孩社群貼文', '毛孩說書人', 15, true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Reward" ("id", "title", "pointsCost", "discountNt", "isActive", "createdAt")
VALUES
 ('starter-50', '結帳折抵 NT$50', 50, 50, true, NOW()),
 ('warm-100', '結帳折抵 NT$100', 95, 100, true, NOW())
ON CONFLICT ("id") DO NOTHING;
