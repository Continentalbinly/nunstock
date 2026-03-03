/*
  Warnings:

  - You are about to drop the column `repairNote` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `repairStep` on the `jobs` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RepairStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "repairNote",
DROP COLUMN "repairStep";

-- CreateTable
CREATE TABLE "job_repair_steps" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "step" "RepairStep" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "RepairStepStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL,

    CONSTRAINT "job_repair_steps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_repair_steps" ADD CONSTRAINT "job_repair_steps_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
