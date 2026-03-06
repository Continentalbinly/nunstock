import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "./auth.js";

export const categoriesRouter = new Hono();

categoriesRouter.get("/", async (c) => {
    try {
        const categories = await prisma.partCategory.findMany({
            include: {
                _count: { select: { parts: true } },
                parent: { select: { id: true, name: true } }
            },
            orderBy: [{ parentId: "asc" }, { name: "asc" }],
        });
        return c.json({ success: true, data: categories });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลประเภทอะไหล่ได้" }, 500);
    }
});

const categorySchema = z.object({
    name: z.string().min(1, "กรุณาระบุชื่อประเภท"),
    color: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().optional().nullable(),
});

categoriesRouter.post("/", requireAuth(), requireRole("ADMIN"), zValidator("json", categorySchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const category = await prisma.partCategory.create({ data: body });
        return c.json({ success: true, data: category }, 201);
    } catch (error: any) {
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "ชื่อประเภทนี้มีอยู่แล้ว" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถเพิ่มประเภทได้" }, 500);
    }
});

const updateCategorySchema = z.object({
    name: z.string().min(1, "กรุณาระบุชื่อประเภท"),
});

categoriesRouter.put("/:id", zValidator("json", updateCategorySchema), async (c) => {
    try {
        const id = c.req.param("id");
        const body = c.req.valid("json");
        const category = await prisma.partCategory.update({ where: { id }, data: { name: body.name } });
        return c.json({ success: true, data: category });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "ชื่อนี้มีอยู่แล้ว" }, 400);
        }
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบประเภทที่ต้องการแก้ไข" }, 404);
        }
        return c.json({ success: false, error: "ไม่สามารถแก้ไขประเภทได้" }, 500);
    }
});

// ─── Move category to a new parent ─────────────────────
categoriesRouter.patch("/:id/move", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const id = c.req.param("id");
        const { newParentId } = await c.req.json();
        if (!newParentId) {
            return c.json({ success: false, error: "newParentId is required" }, 400);
        }
        // Prevent moving to self or own descendants
        const allIds: string[] = [id];
        const collectChildren = async (parentId: string) => {
            const children = await prisma.partCategory.findMany({ where: { parentId }, select: { id: true } });
            for (const child of children) {
                allIds.push(child.id);
                await collectChildren(child.id);
            }
        };
        await collectChildren(id);
        if (allIds.includes(newParentId)) {
            return c.json({ success: false, error: "Cannot move category into itself or its own children" }, 400);
        }
        const category = await prisma.partCategory.update({
            where: { id },
            data: { parentId: newParentId },
        });
        return c.json({ success: true, data: category });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบ category ที่ต้องการย้าย" }, 404);
        }
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "ชื่อนี้มีอยู่แล้วใน parent ปลายทาง" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถย้าย category ได้" }, 500);
    }
});

// ─── Temporary: populate full insurance catalog structure ───
categoriesRouter.post("/populate-catalog", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const results: string[] = [];
        const rootId = "cmmbitw020000krnugh7obtt4"; // รถประกัน

        const structure: Record<string, Record<string, string[]>> = {
            "ญี่ปุ่น": {
                "Toyota": ["Revo", "Vios", "Camry", "Fortuner", "Yaris", "Altis", "Cross", "CHR", "Corolla"],
                "Honda": ["City", "Civic", "HRV", "CRV", "Jazz", "Accord", "BRV"],
                "Nissan": ["Almera", "March", "Navara", "Kicks", "Note", "Tiida"],
                "Isuzu": ["D-Max", "MU-X"],
                "Mazda": ["Mazda2", "Mazda3", "CX-3", "CX-5", "BT-50"],
                "Mitsubishi": ["Triton", "Pajero", "Attrage", "Mirage", "Xpander"],
                "Suzuki": ["Swift", "Ciaz", "Ertiga", "Celerio", "Carry"],
            },
            "ยุโรป": {
                "Mercedes-Benz": ["E-Class", "C-Class", "S-Class", "GLA", "GLC"],
                "BMW": ["Series 3", "Series 5", "X1", "X3", "X5"],
                "Volvo": ["XC40", "XC60", "XC90", "S60"],
                "MG": ["ZS", "HS", "MG3", "MG5"],
            },
            "อเมริกัน": {
                "Ford": ["Ranger", "Everest", "Territory"],
                "Chevrolet": ["Colorado", "Captiva", "Trailblazer"],
            },
        };

        // Get all companies
        const companies = await prisma.partCategory.findMany({ where: { parentId: rootId } });

        for (const company of companies) {
            // Get existing car types for this company
            const existingTypes = await prisma.partCategory.findMany({ where: { parentId: company.id } });

            for (const [typeName, brands] of Object.entries(structure)) {
                // Find or skip car type
                let carType = existingTypes.find(t => t.name === typeName);
                if (!carType) {
                    results.push(`⚠️ "${typeName}" not found under ${company.name} — skipped`);
                    continue;
                }

                const existingBrands = await prisma.partCategory.findMany({ where: { parentId: carType.id } });

                for (const [brandName, models] of Object.entries(brands)) {
                    // Find or create brand
                    let brand = existingBrands.find(b => b.name === brandName);
                    if (!brand) {
                        brand = await prisma.partCategory.create({ data: { name: brandName, parentId: carType.id } });
                        results.push(`✅ Brand: ${brandName} → ${typeName} (${company.name})`);
                    }

                    // Get existing models
                    const existingModels = await prisma.partCategory.findMany({ where: { parentId: brand.id } });
                    const existingModelNames = existingModels.map(m => m.name);

                    for (const modelName of models) {
                        if (!existingModelNames.includes(modelName)) {
                            await prisma.partCategory.create({ data: { name: modelName, parentId: brand.id } });
                            results.push(`  ✅ Model: ${modelName} → ${brandName} (${company.name})`);
                        }
                    }
                }
            }
        }

        return c.json({ success: true, data: { total: results.length, results } });
    } catch (error: any) {
        console.error("Populate error:", error);
        return c.json({ success: false, error: error.message || "Populate failed" }, 500);
    }
});

categoriesRouter.delete("/:id", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const id = c.req.param("id");
        // Recursively collect all descendant category IDs
        const allIds: string[] = [id];
        const collectChildren = async (parentId: string) => {
            const children = await prisma.partCategory.findMany({ where: { parentId }, select: { id: true } });
            for (const child of children) {
                allIds.push(child.id);
                await collectChildren(child.id);
            }
        };
        await collectChildren(id);
        // Delete all parts in those categories, then delete categories bottom-up
        await prisma.part.deleteMany({ where: { categoryId: { in: allIds } } });
        // Delete from deepest to shallowest to avoid FK constraint
        for (let i = allIds.length - 1; i >= 0; i--) {
            await prisma.partCategory.delete({ where: { id: allIds[i] } });
        }
        return c.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบประเภทที่ต้องการลบ" }, 404);
        }
        return c.json({ success: false, error: "ไม่สามารถลบประเภทได้" }, 500);
    }
});
