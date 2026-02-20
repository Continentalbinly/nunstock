import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { parsePagination, paginatedJson } from "../lib/pagination.js";

export const withdrawalsRouter = new Hono();

const withdrawSchema = z.object({
    partId: z.string().min(1, "กรุณาเลือกอะไหล่"),
    quantity: z.number().int().min(1, "จำนวนต้องมากกว่า 0"),
    reason: z.string().optional(),
    jobNo: z.string().optional(),
    techName: z.string().optional(),
});

// GET /api/withdrawals - ประวัติการเบิก (paginated)
withdrawalsRouter.get("/", async (c) => {
    try {
        const { partId } = c.req.query();
        const pag = parsePagination(c);

        const where: any = { ...(partId && { partId }) };

        const [withdrawals, total] = await Promise.all([
            prisma.withdrawal.findMany({
                where,
                include: { part: { include: { category: true } } },
                orderBy: { createdAt: "desc" },
                skip: pag.skip,
                take: pag.take,
            }),
            prisma.withdrawal.count({ where }),
        ]);

        return c.json(paginatedJson(withdrawals, total, pag));
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงประวัติการเบิกได้" }, 500);
    }
});

// POST /api/withdrawals - เบิกอะไหล่
withdrawalsRouter.post("/", zValidator("json", withdrawSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const part = await prisma.part.findUnique({ where: { id: body.partId } });

        if (!part) {
            return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
        }
        if (part.quantity < body.quantity) {
            return c.json({
                success: false,
                error: `สต็อกไม่เพียงพอ มีเพียง ${part.quantity} ${part.unit}`,
            }, 400);
        }

        // Transaction: สร้างการเบิก + ลดสต็อก
        const [withdrawal] = await prisma.$transaction([
            prisma.withdrawal.create({ data: body, include: { part: true } }),
            prisma.part.update({
                where: { id: body.partId },
                data: { quantity: { decrement: body.quantity } },
            }),
        ]);

        return c.json({ success: true, data: withdrawal }, 201);
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเบิกอะไหล่ได้" }, 500);
    }
});
