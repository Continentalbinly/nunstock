-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'NOTIFY_CUSTOMER';

-- AlterTable
ALTER TABLE "job_parts" ADD COLUMN     "withdrawnBy" TEXT;

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'WAITING_PARTS';
