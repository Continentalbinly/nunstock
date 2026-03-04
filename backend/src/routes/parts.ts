import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { parsePagination, paginatedJson } from "../lib/pagination.js";

export const partsRouter = new Hono();

// GET /api/parts/lookup/:code - ค้นหาอะไหล่ด้วยรหัสบาร์โค้ด (exact match)
partsRouter.get("/lookup/:code", async (c) => {
    try {
        const { code } = c.req.param();
        const part = await prisma.part.findFirst({
            where: { code: { equals: code, mode: "insensitive" } },
            include: { category: { include: { parent: { include: { parent: true } } } } },
        });
        if (!part) return c.json({ success: false, error: "ไม่พบอะไหล่ที่ตรงกับรหัสนี้" }, 404);
        return c.json({ success: true, data: part });
    } catch (error) {
        return c.json({ success: false, error: "เกิดข้อผิดพลาด" }, 500);
    }
});

// GET /api/parts - ดึงอะไหล่ทั้งหมด (paginated)
partsRouter.get("/", async (c) => {
    try {
        const { search, categoryId, brand } = c.req.query();
        const pag = parsePagination(c);

        const where: any = {
            ...(search && {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                    { brand: { contains: search, mode: "insensitive" } },
                ],
            }),
            ...(categoryId && { categoryId }),
            ...(brand && { brand: { contains: brand, mode: "insensitive" } }),
        };

        const [parts, total] = await Promise.all([
            prisma.part.findMany({
                where,
                include: { category: { include: { parent: { include: { parent: true } } } } },
                orderBy: { createdAt: "desc" },
                skip: pag.skip,
                take: pag.take,
            }),
            prisma.part.count({ where }),
        ]);

        return c.json(paginatedJson(parts, total, pag));
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
    specification: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    categoryId: z.string().min(1, "กรุณาเลือกประเภท"),
});

const partUpdateSchema = z.object({
    code: z.string().min(1, "กรุณาระบุรหัสอะไหล่").optional(),
    name: z.string().min(1, "กรุณาระบุชื่ออะไหล่").optional(),
    description: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    specification: z.string().optional().nullable(),
    unit: z.string().optional(),
    minStock: z.number().int().min(0).optional(),
    categoryId: z.string().min(1).optional(),
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

// PATCH /api/parts/:id - แก้ไขข้อมูลอะไหล่
partsRouter.patch("/:id", zValidator("json", partUpdateSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const body = c.req.valid("json");

        const existing = await prisma.part.findUnique({ where: { id } });
        if (!existing) return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);

        const part = await prisma.part.update({
            where: { id },
            data: body,
            include: { category: { include: { parent: { include: { parent: true } } } } },
        });
        return c.json({ success: true, data: part });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "รหัสอะไหล่นี้มีอยู่แล้ว" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถแก้ไขอะไหล่ได้" }, 500);
    }
});

// DELETE /api/parts/:id - ลบอะไหล่
partsRouter.delete("/:id", async (c) => {
    try {
        const { id } = c.req.param();

        const existing = await prisma.part.findUnique({
            where: { id },
            include: {
                _count: { select: { movements: true } },
            },
        });
        if (!existing) return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);

        // ถ้ามีประวัติการใช้งาน ให้แจ้งจำนวนด้วย
        const totalUsage = existing._count.movements;
        if (totalUsage > 0) {
            return c.json({
                success: false,
                error: `ไม่สามารถลบได้ อะไหล่นี้มีประวัติการใช้งาน ${totalUsage} รายการ`,
                canForce: true,
            }, 409);
        }

        await prisma.part.delete({ where: { id } });
        return c.json({ success: true, message: "ลบอะไหล่เรียบร้อย" });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถลบอะไหล่ได้" }, 500);
    }
});

// DELETE /api/parts/:id/force - ลบอะไหล่พร้อมประวัติทั้งหมด (force)
partsRouter.delete("/:id/force", async (c) => {
    try {
        const { id } = c.req.param();
        const existing = await prisma.part.findUnique({ where: { id } });
        if (!existing) return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);

        // ลบ dependency ก่อน แล้วค่อยลบ part
        await prisma.$transaction([
            prisma.stockMovement.deleteMany({ where: { partId: id } }),
            prisma.part.delete({ where: { id } }),
        ]);
        return c.json({ success: true, message: "ลบอะไหล่และประวัติทั้งหมดเรียบร้อย" });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถลบอะไหล่ได้" }, 500);
    }
});
