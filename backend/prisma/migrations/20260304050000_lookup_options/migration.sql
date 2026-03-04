-- CreateTable
CREATE TABLE "lookup_options" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lookup_options_group_value_key" ON "lookup_options"("group", "value");

-- Seed default UNIT options
INSERT INTO "lookup_options" ("id", "group", "value", "sortOrder") VALUES
  (gen_random_uuid()::text, 'UNIT', 'ชิ้น', 1),
  (gen_random_uuid()::text, 'UNIT', 'ขวด', 2),
  (gen_random_uuid()::text, 'UNIT', 'ม้วน', 3),
  (gen_random_uuid()::text, 'UNIT', 'หลอด', 4),
  (gen_random_uuid()::text, 'UNIT', 'แผ่น', 5),
  (gen_random_uuid()::text, 'UNIT', 'กระป๋อง', 6),
  (gen_random_uuid()::text, 'UNIT', 'ถุง', 7),
  (gen_random_uuid()::text, 'UNIT', 'กล่อง', 8),
  (gen_random_uuid()::text, 'UNIT', 'แกลลอน', 9),
  (gen_random_uuid()::text, 'UNIT', 'ตัว', 10),
  (gen_random_uuid()::text, 'UNIT', 'คู่', 11),
  (gen_random_uuid()::text, 'UNIT', 'ชุด', 12),
  (gen_random_uuid()::text, 'UNIT', 'ดวง', 13),
  (gen_random_uuid()::text, 'UNIT', 'ลิตร', 14),
  (gen_random_uuid()::text, 'UNIT', 'ถัง', 15),
  (gen_random_uuid()::text, 'UNIT', 'กก.', 16)
ON CONFLICT ("group", "value") DO NOTHING;

-- Seed default SPEC options
INSERT INTO "lookup_options" ("id", "group", "value", "sortOrder") VALUES
  (gen_random_uuid()::text, 'SPEC', '100 มล.', 1),
  (gen_random_uuid()::text, 'SPEC', '200 มล.', 2),
  (gen_random_uuid()::text, 'SPEC', '300 มล.', 3),
  (gen_random_uuid()::text, 'SPEC', '500 มล.', 4),
  (gen_random_uuid()::text, 'SPEC', '1 ลิตร', 5),
  (gen_random_uuid()::text, 'SPEC', '2 ลิตร', 6),
  (gen_random_uuid()::text, 'SPEC', '4 ลิตร', 7),
  (gen_random_uuid()::text, 'SPEC', '5 ลิตร', 8),
  (gen_random_uuid()::text, 'SPEC', '100 กรัม', 9),
  (gen_random_uuid()::text, 'SPEC', '250 กรัม', 10),
  (gen_random_uuid()::text, 'SPEC', '500 กรัม', 11),
  (gen_random_uuid()::text, 'SPEC', '1 กก.', 12),
  (gen_random_uuid()::text, 'SPEC', '5 กก.', 13),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #60', 14),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #80', 15),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #100', 16),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #120', 17),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #150', 18),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #180', 19),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #240', 20),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #320', 21),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #400', 22),
  (gen_random_uuid()::text, 'SPEC', '1 นิ้ว x 10 หลา', 23),
  (gen_random_uuid()::text, 'SPEC', '2 นิ้ว x 10 หลา', 24),
  (gen_random_uuid()::text, 'SPEC', '2 นิ้ว x 20 หลา', 25),
  (gen_random_uuid()::text, 'SPEC', '3 นิ้ว x 10 หลา', 26),
  (gen_random_uuid()::text, 'SPEC', '1 เมตร', 27),
  (gen_random_uuid()::text, 'SPEC', '5 เมตร', 28),
  (gen_random_uuid()::text, 'SPEC', '10 เมตร', 29),
  (gen_random_uuid()::text, 'SPEC', 'เล็ก', 30),
  (gen_random_uuid()::text, 'SPEC', 'กลาง', 31),
  (gen_random_uuid()::text, 'SPEC', 'ใหญ่', 32)
ON CONFLICT ("group", "value") DO NOTHING;
