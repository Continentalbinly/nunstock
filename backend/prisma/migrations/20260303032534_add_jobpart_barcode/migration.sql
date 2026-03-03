-- AlterTable
ALTER TABLE "job_parts" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "job_parts_barcode_key" ON "job_parts"("barcode");
