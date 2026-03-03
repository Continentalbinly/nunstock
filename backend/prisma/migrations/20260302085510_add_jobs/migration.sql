-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('INSURANCE', 'CASH');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RECEIVED', 'WAITING_PARTS', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "JobPartSource" AS ENUM ('SHOP_PART', 'INSURANCE_PART', 'SHOP_STOCK', 'CONSUMABLE', 'EXTERNAL');

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'RECEIVED',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "carBrand" TEXT NOT NULL,
    "carModel" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "notes" TEXT,
    "claimId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_parts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" "JobPartSource" NOT NULL,
    "sourceId" TEXT,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ชิ้น',
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_jobNo_key" ON "jobs"("jobNo");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "insurance_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_parts" ADD CONSTRAINT "job_parts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
