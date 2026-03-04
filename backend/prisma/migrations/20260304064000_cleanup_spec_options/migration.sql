-- Clean up duplicate SPEC values: delete all and re-insert clean set
DELETE FROM "lookup_options" WHERE "group" = 'SPEC';

INSERT INTO "lookup_options" ("id", "group", "value", "sortOrder") VALUES
  -- น้ำมันเครื่อง
  (gen_random_uuid()::text, 'SPEC', '5W-30', 1),
  (gen_random_uuid()::text, 'SPEC', '5W-40', 2),
  (gen_random_uuid()::text, 'SPEC', '10W-30', 3),
  (gen_random_uuid()::text, 'SPEC', '10W-40', 4),
  (gen_random_uuid()::text, 'SPEC', '15W-40', 5),
  (gen_random_uuid()::text, 'SPEC', '20W-50', 6),
  (gen_random_uuid()::text, 'SPEC', 'SAE 30', 7),
  (gen_random_uuid()::text, 'SPEC', 'SAE 40', 8),
  (gen_random_uuid()::text, 'SPEC', 'SAE 90', 9),
  -- กระดาษทราย
  (gen_random_uuid()::text, 'SPEC', 'เกรด #80', 10),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #100', 11),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #120', 12),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #150', 13),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #180', 14),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #240', 15),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #320', 16),
  (gen_random_uuid()::text, 'SPEC', 'เกรด #400', 17),
  -- เทปกาว/ม้วน
  (gen_random_uuid()::text, 'SPEC', '1 นิ้ว x 10 หลา', 18),
  (gen_random_uuid()::text, 'SPEC', '2 นิ้ว x 10 หลา', 19),
  (gen_random_uuid()::text, 'SPEC', '2 นิ้ว x 20 หลา', 20),
  (gen_random_uuid()::text, 'SPEC', '3 นิ้ว x 10 หลา', 21),
  -- ความยาว
  (gen_random_uuid()::text, 'SPEC', '1 เมตร', 22),
  (gen_random_uuid()::text, 'SPEC', '5 เมตร', 23),
  (gen_random_uuid()::text, 'SPEC', '10 เมตร', 24),
  -- ขนาด
  (gen_random_uuid()::text, 'SPEC', 'เล็ก', 25),
  (gen_random_uuid()::text, 'SPEC', 'กลาง', 26),
  (gen_random_uuid()::text, 'SPEC', 'ใหญ่', 27),
  -- ปริมาตร
  (gen_random_uuid()::text, 'SPEC', '0.5L', 28),
  (gen_random_uuid()::text, 'SPEC', '1L', 29),
  (gen_random_uuid()::text, 'SPEC', '4L', 30),
  (gen_random_uuid()::text, 'SPEC', '5L', 31),
  (gen_random_uuid()::text, 'SPEC', '20L', 32)
ON CONFLICT ("group", "value") DO NOTHING;
