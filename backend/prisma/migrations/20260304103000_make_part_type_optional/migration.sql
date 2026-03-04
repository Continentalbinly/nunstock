-- Make Part.type optional (paints don't have a type)
ALTER TABLE "parts" ALTER COLUMN "type" DROP NOT NULL;
