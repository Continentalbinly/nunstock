import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export const partsRouter = new Hono();

// GET /api/parts - ดึงอะไหล่ทั้งหมด
partsRouter.get("/", async (c) => {
    try {
        const { search, categoryId, lowStock } = c.req.query();
        const parts = await prisma.part.findMany({
            where: {
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { code: { contains: search, mode: "insensitive" } },
                        { brand: { contains: search, mode: "insensitive" } },
                    ],
                }),
                ...(categoryId && { categoryId }),
                ...(lowStock === "true" && {
                    quantity: { lte: prisma.part.fields.minStock },
                }),
            },
            include: { category: true },
            orderBy: { createdAt: "desc" },
        });
        // Filter low stock manually if needed
        const filtered =
            lowStock === "true"
                ? parts.filter((p) => p.quantity <= p.minStock)
                : parts;
        return c.json({ success: true, data: filtered });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลอะไหล่ได้" }, 500);
    }
});

// GET /api/parts/:id - ดึงอะไหล่เดี่ยว
partsRouter.get("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        const part = await prisma.part.findUnique({
            where: { id },
            include: {
                category: true,
                withdrawals: { orderBy: { createdAt: "desc" }, take: 10 },
            },
        });
        if (!part) return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
        return c.json({ success: true, data: part });
    } catch (error) {
        return c.json({ success: false, error: "เกิดข้อผิดพลาด" }, 500);
    }
});

// GET /api/parts/barcode/:code - ค้นหาด้วยบาร์โค้ด
partsRouter.get("/barcode/:code", async (c) => {
    try {
        const { code } = c.req.param();
        const part = await prisma.part.findUnique({
            where: { code },
            include: { category: true },
        });
        if (!part) return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
        return c.json({ success: true, data: part });
    } catch (error) {
        return c.json({ success: false, error: "เกิดข้อผิดพลาด" }, 500);
    }
});

const partSchema = z.object({
    code: z.string().min(1, "กรุณาระบุรหัสอะไหล่"),
    name: z.string().min(1, "กรุณาระบุชื่ออะไหล่"),
    description: z.string().optional(),
    brand: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    categoryId: z.string().min(1, "กรุณาเลือกประเภท"),
});

// POST /api/parts - เพิ่มอะไหล่ใหม่
partsRouter.post("/", zValidator("json", partSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const part = await prisma.part.create({
            data: body,
            include: { category: true },
        });
        return c.json({ success: true, data: part }, 201);
    } catch (error: any) {
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "รหัสอะไหล่นี้มีอยู่แล้ว" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถเพิ่มอะไหล่ได้" }, 500);
    }
});

// PUT /api/parts/:id - แก้ไขอะไหล่
partsRouter.put("/:id", zValidator("json", partSchema.partial()), async (c) => {
    try {
        const { id } = c.req.param();
        const body = c.req.valid("json");
        const part = await prisma.part.update({
            where: { id },
            data: body,
            include: { category: true },
        });
        return c.json({ success: true, data: part });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
        }
        return c.json({ success: false, error: "ไม่สามารถแก้ไขอะไหล่ได้" }, 500);
    }
});

// DELETE /api/parts/:id - ลบอะไหล่
partsRouter.delete("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        await prisma.part.delete({ where: { id } });
        return c.json({ success: true, message: "ลบอะไหล่เรียบร้อย" });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
        }
        return c.json({ success: false, error: "ไม่สามารถลบอะไหล่ได้" }, 500);
    }
});
