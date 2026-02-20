import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export const categoriesRouter = new Hono();

categoriesRouter.get("/", async (c) => {
    try {
        const categories = await prisma.partCategory.findMany({
            include: {
                _count: { select: { parts: true } },
            },
            orderBy: { name: "asc" },
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
});

categoriesRouter.post("/", zValidator("json", categorySchema), async (c) => {
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

categoriesRouter.put("/:id", zValidator("json", categorySchema), async (c) => {
    try {
        const { id } = c.req.param();
        const body = c.req.valid("json");
        const category = await prisma.partCategory.update({ where: { id }, data: body });
        return c.json({ success: true, data: category });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถแก้ไขประเภทได้" }, 500);
    }
});

categoriesRouter.delete("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        await prisma.partCategory.delete({ where: { id } });
        return c.json({ success: true, message: "ลบประเภทเรียบร้อย" });
    } catch (error: any) {
        if (error?.code === "P2003") {
            return c.json({ success: false, error: "ไม่สามารถลบได้ เนื่องจากมีอะไหล่ในประเภทนี้" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถลบประเภทได้" }, 500);
    }
});
