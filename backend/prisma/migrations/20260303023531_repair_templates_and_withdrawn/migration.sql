-- AlterEnum
ALTER TYPE "JobPartStatus" ADD VALUE 'WITHDRAWN';

-- Convert step from enum to text (preserve existing data)
ALTER TABLE "job_repair_steps" ALTER COLUMN "step" TYPE TEXT USING "step"::TEXT;

-- CreateTable
CREATE TABLE "repair_step_templates" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Wrench',
    "color" TEXT NOT NULL DEFAULT '#6B7280',

    CONSTRAINT "repair_step_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repair_step_templates_label_key" ON "repair_step_templates"("label");
