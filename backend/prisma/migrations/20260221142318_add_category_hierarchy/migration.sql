-- AlterTable
ALTER TABLE "part_categories" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "part_categories" ADD CONSTRAINT "part_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
