import { prisma } from "./lib/prisma.js";

const categories = [
    { name: "อะไหล่สิ้นเปลือง", color: "#f59e0b", icon: "wrench" },
    { name: "อะไหล่ซ่อม", color: "#3b82f6", icon: "cog" },
    { name: "Body Part", color: "#8b5cf6", icon: "car" },
    { name: "ระบบไฟ", color: "#eab308", icon: "lightbulb" },
    { name: "ระบบแอร์", color: "#06b6d4", icon: "snowflake" },
    { name: "แบตเตอรี่และไฟฟ้า", color: "#22c55e", icon: "battery-charging" },
    { name: "ยางและล้อ", color: "#64748b", icon: "circle-dot" },
    { name: "อื่นๆ", color: "#6b7280", icon: "package" },
];

const sampleParts = [
    { code: "OIL-5W30", name: "น้ำมันเครื่อง 5W-30", brand: "Castrol", quantity: 48, minStock: 10, unit: "ลิตร", catIndex: 0 },
    { code: "FILTER-OIL-001", name: "กรองน้ำมันเครื่อง", brand: "Toyota", quantity: 30, minStock: 10, unit: "ลูก", catIndex: 0 },
    { code: "FILTER-AIR-001", name: "กรองอากาศ", brand: "Bosch", quantity: 25, minStock: 8, unit: "ลูก", catIndex: 0 },
    { code: "SPARK-NGK-001", name: "หัวเทียน NGK", brand: "NGK", quantity: 60, minStock: 20, unit: "ลูก", catIndex: 0 },
    { code: "BRAKE-PAD-F", name: "ผ้าเบรกหน้า", brand: "Brembo", quantity: 12, minStock: 5, unit: "ชุด", catIndex: 1 },
    { code: "BRAKE-PAD-R", name: "ผ้าเบรกหลัง", brand: "Brembo", quantity: 8, minStock: 5, unit: "ชุด", catIndex: 1 },
    { code: "SHOCK-F-001", name: "โช้คหน้า", brand: "Monroe", quantity: 4, minStock: 2, unit: "คู่", catIndex: 1 },
    { code: "BELT-TIMING", name: "สายพานราวลิ้น", brand: "Gates", quantity: 5, minStock: 3, unit: "เส้น", catIndex: 1 },
    { code: "BODY-BUMPER-F", name: "กันชนหน้า", brand: "OEM", quantity: 2, minStock: 1, unit: "ชิ้น", catIndex: 2 },
    { code: "BODY-HOOD", name: "ฝากระโปรงหน้า", brand: "OEM", quantity: 1, minStock: 1, unit: "ชิ้น", catIndex: 2 },
    { code: "LIGHT-H4-55W", name: "หลอดไฟหน้า H4 55W", brand: "Philips", quantity: 20, minStock: 10, unit: "ลูก", catIndex: 3 },
    { code: "COMP-AC-001", name: "คอมแอร์", brand: "Denso", quantity: 2, minStock: 1, unit: "ตัว", catIndex: 4 },
    { code: "BAT-55AH", name: "แบตเตอรี่ 55AH", brand: "Yuasa", quantity: 5, minStock: 2, unit: "ลูก", catIndex: 5 },
    { code: "TIRE-195-65-15", name: "ยาง 195/65 R15", brand: "Bridgestone", quantity: 8, minStock: 4, unit: "เส้น", catIndex: 6 },
];

async function seed() {
    console.log("Seeding database...");

    // สร้างประเภทอะไหล่
    const createdCategories = await Promise.all(
        categories.map((cat) =>
            prisma.partCategory.upsert({
                where: { name: cat.name },
                update: cat,
                create: cat,
            })
        )
    );
    console.log(`[OK] Created ${createdCategories.length} categories`);

    // สร้างอะไหล่ตัวอย่าง
    for (const p of sampleParts) {
        const { catIndex, ...partData } = p;
        await prisma.part.upsert({
            where: { code: partData.code },
            update: { ...partData, categoryId: createdCategories[catIndex].id },
            create: { ...partData, categoryId: createdCategories[catIndex].id },
        });
    }
    console.log(`[OK] Created ${sampleParts.length} sample parts`);
    console.log("[DONE] Seed complete");
}

seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
