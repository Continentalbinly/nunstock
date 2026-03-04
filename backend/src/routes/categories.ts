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
