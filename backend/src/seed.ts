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
    const lookupGroups: Record<string, string[]> = {
        UNIT_CONSUMABLE: ["ชิ้น", "ขวด", "ม้วน", "หลอด", "แผ่น", "กระป๋อง", "ถุง", "กล่อง", "แกลลอน", "ตัว", "คู่", "ชุด", "ดวง"],
        UNIT_PAINT: ["กระป๋อง", "แกลลอน", "ลิตร", "ขวด", "ถัง", "กก."],
        UNIT_SHOP: ["ชิ้น", "อัน", "ตัว", "คู่", "ชุด", "เส้น"],
        SPEC: [
            "5W-30", "5W-40", "10W-30", "10W-40", "15W-40", "20W-50",
            "SAE 30", "SAE 40", "SAE 90",
            "#60", "#80", "#100", "#120", "#150", "#180", "#220", "#240",
            "#280", "#320", "#400", "#500", "#600", "#800", "#1000",
            "#1200", "#1500", "#2000",
            "0.5L", "1L", "4L", "5L", "20L",
        ],
    };

    let created = 0;
    for (const [group, values] of Object.entries(lookupGroups)) {
        for (let i = 0; i < values.length; i++) {
            const val = values[i];
            const exists = await prisma.lookupOption.findFirst({ where: { group, value: val } });
            if (!exists) {
                await prisma.lookupOption.create({
                    data: { group, value: val, sortOrder: i + 1 },
                });
                created++;
            }
        }
    }
    console.log(`[OK] Lookup options: ${created} new added (${created === 0 ? "all existed" : "seeded"})`);

    console.log("\n✅ Seed complete!");
}

seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());

