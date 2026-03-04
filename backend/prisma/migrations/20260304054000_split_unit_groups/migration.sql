-- Split generic "UNIT" into module-specific groups
-- Step 1: Insert module-specific unit options

-- UNIT_CONSUMABLE (วัสดุสิ้นเปลือง)
INSERT INTO "lookup_options" ("id", "group", "value", "sortOrder") VALUES
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'ชิ้น', 1),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'ขวด', 2),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'ม้วน', 3),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'หลอด', 4),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'แผ่น', 5),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'กระป๋อง', 6),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'ถุง', 7),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'กล่อง', 8),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'แกลลอน', 9),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'ตัว', 10),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'คู่', 11),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'ชุด', 12),
  (gen_random_uuid()::text, 'UNIT_CONSUMABLE', 'ดวง', 13)
ON CONFLICT ("group", "value") DO NOTHING;

-- UNIT_PAINT (คลังสี)
INSERT INTO "lookup_options" ("id", "group", "value", "sortOrder") VALUES
  (gen_random_uuid()::text, 'UNIT_PAINT', 'กระป๋อง', 1),
  (gen_random_uuid()::text, 'UNIT_PAINT', 'แกลลอน', 2),
  (gen_random_uuid()::text, 'UNIT_PAINT', 'ลิตร', 3),
  (gen_random_uuid()::text, 'UNIT_PAINT', 'ขวด', 4),
  (gen_random_uuid()::text, 'UNIT_PAINT', 'ถัง', 5),
  (gen_random_uuid()::text, 'UNIT_PAINT', 'กก.', 6)
ON CONFLICT ("group", "value") DO NOTHING;

-- UNIT_SHOP (สต็อกอู่)
INSERT INTO "lookup_options" ("id", "group", "value", "sortOrder") VALUES
  (gen_random_uuid()::text, 'UNIT_SHOP', 'ชิ้น', 1),
  (gen_random_uuid()::text, 'UNIT_SHOP', 'อัน', 2),
  (gen_random_uuid()::text, 'UNIT_SHOP', 'ตัว', 3),
  (gen_random_uuid()::text, 'UNIT_SHOP', 'คู่', 4),
  (gen_random_uuid()::text, 'UNIT_SHOP', 'ชุด', 5),
  (gen_random_uuid()::text, 'UNIT_SHOP', 'เส้น', 6)
ON CONFLICT ("group", "value") DO NOTHING;

-- Step 2: Remove old generic UNIT entries (no longer used)
DELETE FROM "lookup_options" WHERE "group" = 'UNIT';
