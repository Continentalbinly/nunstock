-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'ORDERED', 'ARRIVED', 'NOTIFIED', 'COMPLETED');

-- CreateTable
CREATE TABLE "part_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT '📦',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'ชิ้น',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "jobNo" TEXT,
    "techName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claims" (
    "id" TEXT NOT NULL,
    "claimNo" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "carBrand" TEXT NOT NULL,
    "carModel" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "insuranceComp" TEXT NOT NULL,
    "jobNo" TEXT,
    "notes" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "arrivedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "notifyChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_items" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "partId" TEXT,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "claim_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_categories_name_key" ON "part_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "parts_code_key" ON "parts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claims_claimNo_key" ON "insurance_claims"("claimNo");

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_items" ADD CONSTRAINT "claim_items_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "insurance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_items" ADD CONSTRAINT "claim_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
