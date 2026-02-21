/*
  Warnings:

  - A unique constraint covering the columns `[name,parentId]` on the table `part_categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "part_categories_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "part_categories_name_parentId_key" ON "part_categories"("name", "parentId");
