-- CreateTable
CREATE TABLE "line_registrations" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "normalizedPlate" TEXT NOT NULL,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "matchedClaimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "line_registrations_lineUserId_normalizedPlate_key" ON "line_registrations"("lineUserId", "normalizedPlate");
