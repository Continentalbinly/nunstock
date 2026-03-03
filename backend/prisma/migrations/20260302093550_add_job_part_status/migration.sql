-- CreateEnum
CREATE TYPE "JobPartStatus" AS ENUM ('ORDERED', 'ARRIVED', 'INSTALLED');

-- AlterTable
ALTER TABLE "job_parts" ADD COLUMN     "status" "JobPartStatus" NOT NULL DEFAULT 'ORDERED';
