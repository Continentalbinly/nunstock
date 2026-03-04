-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('CONSUMABLE', 'INSURANCE');

-- AlterTable (Part)
ALTER TABLE "parts" ADD COLUMN "type" "PartType" NOT NULL DEFAULT 'CONSUMABLE';
ALTER TABLE "parts" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable (ShopStock) 
ALTER TABLE "shop_stocks" DROP COLUMN "categoryId";
