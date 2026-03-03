-- CreateEnum
CREATE TYPE "ShopStockSource" AS ENUM ('EXCESS_ORDER', 'CUSTOMER_LEFTOVER', 'CLAIM_MISMATCH', 'CLAIM_NO_PICKUP');

-- CreateEnum
CREATE TYPE "ShopStockCondition" AS ENUM ('USABLE', 'NEEDS_REPAIR', 'SCRAP');

-- CreateTable
CREATE TABLE "shop_stocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "carBrand" TEXT,
    "carModel" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'ชิ้น',
    "source" "ShopStockSource" NOT NULL,
    "sourceRef" TEXT,
    "sourceNote" TEXT,
    "condition" "ShopStockCondition" NOT NULL DEFAULT 'USABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_stock_usages" (
    "id" TEXT NOT NULL,
    "shopStockId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "jobNo" TEXT,
    "note" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_stock_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "shop_stocks" ADD CONSTRAINT "shop_stocks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_stock_usages" ADD CONSTRAINT "shop_stock_usages_shopStockId_fkey" FOREIGN KEY ("shopStockId") REFERENCES "shop_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
