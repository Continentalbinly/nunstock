import { prisma } from "./lib/prisma.js";

// ─── Brand → Models mapping (รุ่นรถยอดนิยมในไทย) ───────────
const BRAND_MODELS: Record<string, string[]> = {
    // Japanese
    "Toyota": ["Hilux Revo", "Hilux Vigo", "Fortuner", "Yaris", "Vios", "Camry", "Corolla Cross", "C-HR"],
    "Honda": ["City", "Civic", "CR-V", "HR-V", "Accord", "Jazz", "BR-V"],
    "Isuzu": ["D-Max", "MU-X"],
    "Mitsubishi": ["Triton", "Pajero Sport", "Xpander", "Attrage", "Mirage"],
    "Mazda": ["CX-5", "CX-30", "Mazda2", "Mazda3", "BT-50"],
    "Nissan": ["Navara", "March", "Almera", "Kicks", "X-Trail"],
    "Suzuki": ["Swift", "Ciaz", "Ertiga", "XL7", "Carry"],
    // Korean
    "Hyundai": ["Creta", "H-1", "Stargazer"],
    "Kia": ["Seltos", "Sonet", "EV6"],
    // Chinese / New EV
    "MG": ["ZS", "HS", "EP", "MG5"],
    "BYD": ["Atto 3", "Dolphin", "Seal"],
    // American
    "Ford": ["Ranger", "Everest"],
    "Chevrolet": ["Colorado", "Trailblazer", "Captiva"],
    // European
    "BMW": ["Series 3", "Series 5", "X1", "X3"],
    "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC"],
    "Volvo": ["XC40", "XC60", "XC90"],
    "Subaru": ["Forester", "XV", "BRZ"],
};

async function seed() {
    console.log("🌱 Seeding database…\n");

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

    // ─── Helper: create brands + models under a parent ──────────
    async function createBrandsWithModels(parentId: string, color: string) {
        const brandsMap: Record<string, any> = {};
        const modelsMap: Record<string, Record<string, any>> = {};

        for (const [brand, models] of Object.entries(BRAND_MODELS)) {
            // Create brand category
            const brandCat = await prisma.partCategory.create({
                data: { name: brand, color, icon: "car", parentId }
            });
            brandsMap[brand] = brandCat;
            modelsMap[brand] = {};

            // Create model sub-categories under brand
            for (const model of models) {
                const modelCat = await prisma.partCategory.create({
                    data: { name: model, color, icon: "car", parentId: brandCat.id }
                });
                modelsMap[brand][model] = modelCat;
            }
        }
        return { brandsMap, modelsMap };
    }

    // ─── Shop: Brands + Models ──────────────────────────────────
    const shop = await createBrandsWithModels(shopCat.id, "#10b981");
    const totalShopModels = Object.values(BRAND_MODELS).reduce((sum, m) => sum + m.length, 0);
    console.log(`[OK] Created ${Object.keys(BRAND_MODELS).length} brands × models (${totalShopModels} total) under รถหน้าร้าน`);

    // ─── Insurance Company ──────────────────────────────────────
    const samukkee = await prisma.partCategory.create({
        data: { name: "ศามัคคีประกันภัย", color: "#6366f1", icon: "building", parentId: insuranceCat.id }
    });
    console.log("[OK] Created insurance company: ศามัคคีประกันภัย");

    // ─── Insurance: Brands + Models under company ───────────────
    const insurance = await createBrandsWithModels(samukkee.id, "#8b5cf6");
    console.log(`[OK] Created ${Object.keys(BRAND_MODELS).length} brands × models under ศามัคคีประกันภัย`);

    // ─── Sample Parts (now under model level) ───────────────────
    const parts = [
        // รถหน้าร้าน > Toyota > Hilux Revo
        { code: "SH-TYT-001", name: "กันชนหน้า Revo", brand: "OEM", quantity: 3, minStock: 1, unit: "ชิ้น", categoryId: shop.modelsMap["Toyota"]["Hilux Revo"].id },
        { code: "SH-TYT-002", name: "ฝากระโปรง Revo", brand: "OEM", quantity: 2, minStock: 1, unit: "ชิ้น", categoryId: shop.modelsMap["Toyota"]["Hilux Revo"].id },

        // รถหน้าร้าน > Honda > Civic
        { code: "SH-HND-001", name: "ไฟหน้า Civic", brand: "Stanley", quantity: 4, minStock: 2, unit: "ดวง", categoryId: shop.modelsMap["Honda"]["Civic"].id },

        // รถหน้าร้าน > Isuzu > D-Max
        { code: "SH-ISZ-001", name: "ไฟท้าย D-Max", brand: "OEM", quantity: 2, minStock: 1, unit: "ดวง", categoryId: shop.modelsMap["Isuzu"]["D-Max"].id },

        // ประกัน > ศามัคคี > Toyota > Yaris
        { code: "IN-TYT-001", name: "กันชนหน้า Yaris", brand: "OEM", quantity: 1, minStock: 1, unit: "ชิ้น", categoryId: insurance.modelsMap["Toyota"]["Yaris"].id },
        { code: "IN-TYT-002", name: "บังโคลนหน้า Vios", brand: "OEM", quantity: 2, minStock: 1, unit: "ชิ้น", categoryId: insurance.modelsMap["Toyota"]["Vios"].id },

        // ประกัน > ศามัคคี > Honda > City
        { code: "IN-HND-001", name: "กระจกข้าง City", brand: "OEM", quantity: 2, minStock: 1, unit: "ชิ้น", categoryId: insurance.modelsMap["Honda"]["City"].id },

        // ประกัน > ศามัคคี > Isuzu > D-Max
        { code: "IN-ISZ-001", name: "กันชนหลัง D-Max", brand: "OEM", quantity: 1, minStock: 1, unit: "ชิ้น", categoryId: insurance.modelsMap["Isuzu"]["D-Max"].id },

        // อุปกรณ์สิ้นเปลือง
        { code: "CON-001", name: "น้ำมันเครื่อง 5W-30", brand: "Castrol", specification: "1 ลิตร", quantity: 48, minStock: 10, unit: "ขวด", categoryId: consumableCat.id },
        { code: "CON-002", name: "เทปกาว", brand: "3M", specification: "2 นิ้ว x 10 หลา", quantity: 20, minStock: 5, unit: "ม้วน", categoryId: consumableCat.id },
        { code: "CON-003", name: "กาวซิลิโคน", brand: "Dowsil", specification: "300 มล.", quantity: 15, minStock: 5, unit: "หลอด", categoryId: consumableCat.id },
        { code: "CON-004", name: "กระดาษทราย", brand: "3M", specification: "เกรด #120", quantity: 100, minStock: 20, unit: "แผ่น", categoryId: consumableCat.id },
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
