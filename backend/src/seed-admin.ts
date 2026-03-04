import { prisma } from "./lib/prisma.js";
import bcrypt from "bcryptjs";

async function seedAdmin() {
    const existing = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!existing) {
        await prisma.user.create({
            data: {
                username: "admin",
                password: await bcrypt.hash("admin1234", 12),
                name: "ผู้ดูแลระบบ",
                role: "ADMIN",
            },
        });
        console.log("[OK] Created admin user (username: admin, password: admin1234)");
    } else {
        console.log("[INFO] Admin user already exists");
    }
}

seedAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
