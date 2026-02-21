import { prisma } from "./lib/prisma.js";

async function seed() {
    console.log("🌱 Seeding database...\n");

    // 1. Clear existing data
    await prisma.stockMovement.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.claimItem.deleteMany();
    await prisma.insuranceClaim.deleteMany();
    await prisma.part.deleteMany();
    await prisma.partCategory.deleteMany();
    console.log("[OK] Cleared old data");

    // ─── Top-Level Categories ───────────────────────────────────
    const shopCat = await prisma.partCategory.create({
        data: { name: "รถหน้าร้าน", color: "#10b981", icon: "store" }
    });
    const insuranceCat = await prisma.partCategory.create({
        data: { name: "รถประกัน", color: "#3b82f6", icon: "shield" }
    });
    const consumableCat = await prisma.partCategory.create({
        data: { name: "อุปกรณ์สิ้นเปลือง", color: "#f59e0b", icon: "wrench" }
    });
    console.log("[OK] Created 3 top-level categories");

    // ─── Car Brands (5 ยี่ห้อยอดนิยมในไทย) ─────────────────────
    const brands = ["Toyota", "Honda", "Isuzu", "Mitsubishi", "Mazda"];

    // Level 2: Brands under รถหน้าร้าน
    const shopBrands: Record<string, any> = {};
    for (const brand of brands) {
        shopBrands[brand] = await prisma.partCategory.create({
            data: { name: brand, color: "#10b981", icon: "car", parentId: shopCat.id }
        });
    }
    console.log(`[OK] Created ${brands.length} brands under รถหน้าร้าน`);

    // Level 2: Insurance Company under รถประกัน
    const samukkee = await prisma.partCategory.create({
        data: { name: "ศามัคคีประกันภัย", color: "#6366f1", icon: "building", parentId: insuranceCat.id }
    });
    console.log("[OK] Created insurance company: ศามัคคีประกันภัย");

    // Level 3: Brands under ศามัคคีประกันภัย
    const insuranceBrands: Record<string, any> = {};
    for (const brand of brands) {
        insuranceBrands[brand] = await prisma.partCategory.create({
            data: { name: brand, color: "#8b5cf6", icon: "car", parentId: samukkee.id }
        });
    }
    console.log(`[OK] Created ${brands.length} brands under ศามัคคีประกันภัย`);

    // ─── Sample Parts ───────────────────────────────────────────
    const parts = [
        // รถหน้าร้าน > Toyota
        { code: "SH-TYT-001", name: "กันชนหน้า Revo", brand: "OEM", quantity: 3, minStock: 1, unit: "ชิ้น", categoryId: shopBrands["Toyota"].id },
        { code: "SH-TYT-002", name: "ฝากระโปรง Hilux", brand: "OEM", quantity: 2, minStock: 1, unit: "ชิ้น", categoryId: shopBrands["Toyota"].id },

        // รถหน้าร้าน > Honda
        { code: "SH-HND-001", name: "ไฟหน้า Civic", brand: "Stanley", quantity: 4, minStock: 2, unit: "ดวง", categoryId: shopBrands["Honda"].id },

        // รถหน้าร้าน > Isuzu
        { code: "SH-ISZ-001", name: "ไฟท้าย D-Max", brand: "OEM", quantity: 2, minStock: 1, unit: "ดวง", categoryId: shopBrands["Isuzu"].id },

        // ประกัน > ศามัคคี > Toyota
        { code: "IN-TYT-001", name: "กันชนหน้า Yaris", brand: "OEM", quantity: 1, minStock: 1, unit: "ชิ้น", categoryId: insuranceBrands["Toyota"].id },
        { code: "IN-TYT-002", name: "บังโคลนหน้า Vios", brand: "OEM", quantity: 2, minStock: 1, unit: "ชิ้น", categoryId: insuranceBrands["Toyota"].id },

        // ประกัน > ศามัคคี > Honda
        { code: "IN-HND-001", name: "กระจกข้าง City", brand: "OEM", quantity: 2, minStock: 1, unit: "ชิ้น", categoryId: insuranceBrands["Honda"].id },

        // ประกัน > ศามัคคี > Isuzu
        { code: "IN-ISZ-001", name: "กันชนหลัง D-Max", brand: "OEM", quantity: 1, minStock: 1, unit: "ชิ้น", categoryId: insuranceBrands["Isuzu"].id },

        // อุปกรณ์สิ้นเปลือง
        { code: "CON-001", name: "น้ำมันเครื่อง 5W-30", brand: "Castrol", quantity: 48, minStock: 10, unit: "ลิตร", categoryId: consumableCat.id },
        { code: "CON-002", name: "เทปกาว 3M", brand: "3M", quantity: 20, minStock: 5, unit: "ม้วน", categoryId: consumableCat.id },
        { code: "CON-003", name: "กาวซิลิโคน", brand: "Dowsil", quantity: 15, minStock: 5, unit: "หลอด", categoryId: consumableCat.id },
        { code: "CON-004", name: "กระดาษทราย #120", brand: "3M", quantity: 100, minStock: 20, unit: "แผ่น", categoryId: consumableCat.id },
    ];

    for (const p of parts) {
        await prisma.part.create({ data: p });
    }
    console.log(`[OK] Created ${parts.length} sample parts`);

    console.log("\n✅ Seed complete!");
}

seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
