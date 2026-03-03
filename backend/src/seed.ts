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

    console.log("\n✅ Seed complete!");
}

seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
