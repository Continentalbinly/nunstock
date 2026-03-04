import { prisma } from "./lib/prisma.js";
import bcrypt from "bcryptjs";

async function seed() {
    console.log("🌱 Seeding database (production mode)…\n");

    // Only create admin user — safe to run multiple times
    const existing = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!existing) {
        await prisma.user.create({
            data: {
                username: "admin",
                password: await bcrypt.hash("admin1234", 12),
                name: "ผู้ดูแลระบบ",
                role: "admin",
            },
        });
        console.log("[OK] Created admin user (username: admin, password: admin1234)");
    } else {
        console.log("[INFO] Admin user already exists — skipped");
    }

    // ── Seed Lookup Options ──
    const existingOptions = await prisma.lookupOption.count();
    if (existingOptions > 0) {
        console.log(`[INFO] Lookup options already exist (${existingOptions} rows) — skipped`);
    } else {
        const lookupGroups: Record<string, string[]> = {
            UNIT_CONSUMABLE: ["ชิ้น", "ขวด", "ม้วน", "หลอด", "แผ่น", "กระป๋อง", "ถุง", "กล่อง", "แกลลอน", "ตัว", "คู่", "ชุด", "ดวง"],
            UNIT_PAINT: ["กระป๋อง", "แกลลอน", "ลิตร", "ขวด", "ถัง", "กก."],
            UNIT_SHOP: ["ชิ้น", "อัน", "ตัว", "คู่", "ชุด", "เส้น"],
            SPEC: [
                "5W-30", "5W-40", "10W-30", "10W-40", "15W-40", "20W-50",
                "SAE 30", "SAE 40", "SAE 90",
                "เกรด #80", "เกรด #100", "เกรด #120", "เกรด #150", "เกรด #180", "เกรด #240", "เกรด #320", "เกรด #400",
                "1 นิ้ว x 10 หลา", "2 นิ้ว x 10 หลา", "2 นิ้ว x 20 หลา", "3 นิ้ว x 10 หลา",
                "1 เมตร", "5 เมตร", "10 เมตร",
                "เล็ก", "กลาง", "ใหญ่",
                "0.5L", "1L", "4L", "5L", "20L",
            ],
        };

        let created = 0;
        for (const [group, values] of Object.entries(lookupGroups)) {
            for (let i = 0; i < values.length; i++) {
                await prisma.lookupOption.create({
                    data: { group, value: values[i], sortOrder: i + 1 },
                });
                created++;
            }
        }
        console.log(`[OK] Lookup options: ${created} created`);
    }

    console.log("\n✅ Seed complete!");
}

seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());

