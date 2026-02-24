-- AlterTable: เพิ่ม lineUserId และ lineLinkedAt ใน insurance_claims
ALTER TABLE "insurance_claims" ADD COLUMN "lineUserId" TEXT;
ALTER TABLE "insurance_claims" ADD COLUMN "lineLinkedAt" TIMESTAMP(3);
