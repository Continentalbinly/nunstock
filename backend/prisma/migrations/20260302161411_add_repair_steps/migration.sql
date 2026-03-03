-- CreateEnum
CREATE TYPE "RepairStep" AS ENUM ('BODY_REPAIR', 'PAINTING', 'PARTS_REPLACEMENT', 'POLISHING');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "repairNote" TEXT,
ADD COLUMN     "repairStep" "RepairStep";
