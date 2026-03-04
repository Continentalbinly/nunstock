import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { parsePagination, paginatedJson } from "../lib/pagination.js";

export const shopStockRouter = new Hono();

// ---- Schemas ----
const createSchema = z.object({
    name: z.string().min(1, "กรุณาระบุชื่ออะไหล่"),
    description: z.string().optional(),
    carBrand: z.string().optional(),
    carModel: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
    unit: z.string().optional(),
    source: z.enum(["EXCESS_ORDER", "CUSTOMER_LEFTOVER", "CLAIM_MISMATCH", "CLAIM_NO_PICKUP"]),
    sourceRef: z.string().optional(),
    sourceNote: z.string().optional(),
    condition: z.enum(["USABLE", "NEEDS_REPAIR", "SCRAP"]).default("USABLE"),
});

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    carBrand: z.string().optional().nullable(),
    carModel: z.string().optional().nullable(),
    unit: z.string().optional(),
    sourceRef: z.string().optional().nullable(),
    sourceNote: z.string().optional().nullable(),
    condition: z.enum(["USABLE", "NEEDS_REPAIR", "SCRAP"]).optional(),
});

const conditionSchema = z.object({
    condition: z.enum(["USABLE", "NEEDS_REPAIR", "SCRAP"]),
});

const useSchema = z.object({
    quantity: z.number().int().min(1, "จำนวนต้องมากกว่า 0"),
    jobNo: z.string().optional(),
    note: z.string().optional(),
});

// GET /api/shop-stock/summary — สรุปสต็อกหน้าร้าน
shopStockRouter.get("/summary", async (c) => {
    try {
        const [total, usable, needsRepair, scrap, bySource] = await Promise.all([
            prisma.shopStock.aggregate({ _sum: { quantity: true }, _count: true }),
            prisma.shopStock.aggregate({ where: { condition: "USABLE" }, _sum: { quantity: true }, _count: true }),
            prisma.shopStock.aggregate({ where: { condition: "NEEDS_REPAIR" }, _sum: { quantity: true }, _count: true }),
            prisma.shopStock.aggregate({ where: { condition: "SCRAP" }, _sum: { quantity: true }, _count: true }),
            prisma.shopStock.groupBy({
                by: ["source"],
                _sum: { quantity: true },
                _count: true,
            }),
        ]);

        return c.json({
            success: true,
            data: {
                total: { count: total._count, qty: total._sum.quantity || 0 },
                usable: { count: usable._count, qty: usable._sum.quantity || 0 },
                needsRepair: { count: needsRepair._count, qty: needsRepair._sum.quantity || 0 },
                scrap: { count: scrap._count, qty: scrap._sum.quantity || 0 },
                bySource: bySource.map((s) => ({
                    source: s.source,
                    count: s._count,
                    qty: s._sum.quantity || 0,
                })),
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลสรุปได้" }, 500);
    }
});

// GET /api/shop-stock — รายการสต็อกหน้าร้าน (paginated + filter)
shopStockRouter.get("/", async (c) => {
    try {
        const { search, source, condition, carBrand, carModel } = c.req.query();
        const pag = parsePagination(c);

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { carBrand: { contains: search, mode: "insensitive" } },
                { carModel: { contains: search, mode: "insensitive" } },
                { sourceRef: { contains: search, mode: "insensitive" } },
            ];
        }
        if (source) where.source = source;
        if (condition) where.condition = condition;
        if (carBrand) where.carBrand = { contains: carBrand, mode: "insensitive" };
        if (carModel) where.carModel = { contains: carModel, mode: "insensitive" };

        const [items, total] = await Promise.all([
            prisma.shopStock.findMany({
                where,
                include: {
                    usages: { orderBy: { usedAt: "desc" }, take: 5 },
                },
                orderBy: { createdAt: "desc" },
                skip: pag.skip,
                take: pag.take,
            }),
            prisma.shopStock.count({ where }),
        ]);

        return c.json(paginatedJson(items, total, pag));
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลสต็อกได้" }, 500);
    }
});

// POST /api/shop-stock — เพิ่มอะไหล่เข้าสต็อก (manual)
shopStockRouter.post("/", zValidator("json", createSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const item = await prisma.shopStock.create({
            data: body,
            include: { usages: true },
        });
        return c.json({ success: true, data: item }, 201);
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเพิ่มอะไหล่ได้" }, 500);
    }
});

// PATCH /api/shop-stock/:id — แก้ไขข้อมูล
shopStockRouter.patch("/:id", zValidator("json", updateSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const body = c.req.valid("json");

        const existing = await prisma.shopStock.findUnique({ where: { id } });
        if (!existing) return c.json({ success: false, error: "ไม่พบรายการนี้" }, 404);

        const item = await prisma.shopStock.update({
            where: { id },
            data: body,
            include: { usages: true },
        });
        return c.json({ success: true, data: item });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถแก้ไขได้" }, 500);
    }
});

// PATCH /api/shop-stock/:id/condition — อัพเดทสถานะ
shopStockRouter.patch("/:id/condition", zValidator("json", conditionSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const { condition } = c.req.valid("json");

        const existing = await prisma.shopStock.findUnique({ where: { id } });
        if (!existing) return c.json({ success: false, error: "ไม่พบรายการนี้" }, 404);

        const item = await prisma.shopStock.update({
            where: { id },
            data: { condition },
            include: { usages: true },
        });
        return c.json({ success: true, data: item });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเปลี่ยนสถานะได้" }, 500);
    }
});

// POST /api/shop-stock/:id/use — ตัดสต็อก (ใช้ใน Job)
shopStockRouter.post("/:id/use", zValidator("json", useSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const { quantity, jobNo, note } = c.req.valid("json");

        const existing = await prisma.shopStock.findUnique({ where: { id } });
        if (!existing) return c.json({ success: false, error: "ไม่พบรายการนี้" }, 404);
        if (existing.quantity < quantity) {
            return c.json({ success: false, error: `สต็อกไม่พอ (เหลือ ${existing.quantity} ${existing.unit})` }, 400);
        }

        const [updatedStock, usage] = await prisma.$transaction([
            prisma.shopStock.update({
                where: { id },
                data: { quantity: { decrement: quantity } },
                include: { usages: true },
            }),
            prisma.shopStockUsage.create({
                data: { shopStockId: id, quantity, jobNo, note },
            }),
        ]);

        return c.json({ success: true, data: { stock: updatedStock, usage } });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถตัดสต็อกได้" }, 500);
    }
});

// DELETE /api/shop-stock/:id — ลบรายการ
shopStockRouter.delete("/:id", async (c) => {
    try {
        const { id } = c.req.param();

        const existing = await prisma.shopStock.findUnique({
            where: { id },
            include: { _count: { select: { usages: true } } },
        });
        if (!existing) return c.json({ success: false, error: "ไม่พบรายการนี้" }, 404);

        if (existing._count.usages > 0) {
            // Force delete — ลบ usages ก่อนแล้วลบ stock
            await prisma.$transaction([
                prisma.shopStockUsage.deleteMany({ where: { shopStockId: id } }),
                prisma.shopStock.delete({ where: { id } }),
            ]);
        } else {
            await prisma.shopStock.delete({ where: { id } });
        }

        return c.json({ success: true, message: "ลบรายการเรียบร้อย" });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถลบได้" }, 500);
    }
});
