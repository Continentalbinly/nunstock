-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);
