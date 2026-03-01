import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "./auth.js";
import { parsePagination, paginatedJson } from "../lib/pagination.js";

export const movementsRouter = new Hono();

const movementSchema = z.object({
    partId: z.string().min(1, "กรุณาเลือกอะไหล่"),
    type: z.enum(["IN", "OUT"]),
    quantity: z.number().int().min(1, "จำนวนต้องมากกว่า 0"),
    reason: z.string().optional(),
    jobNo: z.string().optional(),
    techName: z.string().optional(),
});

// GET /api/movements — ดึงประวัติเคลื่อนไหวสต็อก (paginated)
movementsRouter.get("/", async (c) => {
    try {
        const { partId, type } = c.req.query();
        const pag = parsePagination(c);

        const where: any = {
            ...(partId && { partId }),
            ...(type && { type: type as any }),
        };

        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                include: {
                    part: { include: { category: true } },
                    user: { select: { id: true, username: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: pag.skip,
                take: pag.take,
            }),
            prisma.stockMovement.count({ where }),
        ]);

        return c.json(paginatedJson(movements, total, pag));
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงประวัติได้" }, 500);
    }
});

// POST /api/movements — สร้างรายการเคลื่อนไหว (ต้อง login)
movementsRouter.post("/", requireAuth(), zValidator("json", movementSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const user = (c as any).get("user");
        const part = await prisma.part.findUnique({ where: { id: body.partId } });

        if (!part) {
            return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
        }

        // OUT: check stock
        if (body.type === "OUT") {
            if (part.quantity < body.quantity) {
                return c.json({
                    success: false,
                    error: `สต็อกไม่เพียงพอ มีเพียง ${part.quantity} ${part.unit}`,
                }, 400);
            }
        }

        // Transaction: create movement + update stock
        const [movement] = await prisma.$transaction([
            prisma.stockMovement.create({
                data: {
                    partId: body.partId,
                    type: body.type,
                    quantity: body.quantity,
                    reason: body.reason || null,
                    jobNo: body.jobNo || null,
                    techName: body.techName || null,
                    userId: user.id,
                },
                include: {
                    part: { include: { category: true } },
                    user: { select: { id: true, username: true, name: true } },
                },
            }),
            prisma.part.update({
                where: { id: body.partId },
                data: {
                    quantity: body.type === "IN"
                        ? { increment: body.quantity }
                        : { decrement: body.quantity },
                },
            }),
        ]);

        return c.json({ success: true, data: movement }, 201);
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถบันทึกรายการได้" }, 500);
    }
});

// POST /api/movements/batch — เบิกอะไหล่หลายรายการพร้อมกัน (ต้อง login)
const batchSchema = z.object({
    items: z.array(z.object({
        partId: z.string().min(1),
        quantity: z.number().int().min(1),
        reason: z.string().optional(),
    })).min(1, "ต้องมีอย่างน้อย 1 รายการ"),
    reason: z.string().optional(),
});

movementsRouter.post("/batch", requireAuth(), zValidator("json", batchSchema), async (c) => {
    try {
        const { items, reason: globalReason } = c.req.valid("json");
        const user = (c as any).get("user");

        const partIds = items.map(i => i.partId);
        const parts = await prisma.part.findMany({ where: { id: { in: partIds } } });
        const partMap = new Map(parts.map(p => [p.id, p]));

        const errors: string[] = [];
        for (const item of items) {
            const part = partMap.get(item.partId);
            if (!part) { errors.push(`ไม่พบอะไหล่ ID: ${item.partId}`); continue; }
            if (part.quantity < item.quantity) {
                errors.push(`${part.name}: สต็อกไม่เพียงพอ (มี ${part.quantity} ${part.unit}, ต้องการ ${item.quantity})`);
            }
        }
        if (errors.length > 0) return c.json({ success: false, error: errors.join("\n"), errors }, 400);

        const ops = items.flatMap(item => [
            prisma.stockMovement.create({
                data: { partId: item.partId, type: "OUT", quantity: item.quantity, reason: item.reason || globalReason || null, userId: user.id },
            }),
            prisma.part.update({ where: { id: item.partId }, data: { quantity: { decrement: item.quantity } } }),
        ]);
        await prisma.$transaction(ops);

        return c.json({ success: true, data: { count: items.length, items: items.map(i => ({ partId: i.partId, quantity: i.quantity, name: partMap.get(i.partId)?.name })) } }, 201);
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถบันทึกรายการได้" }, 500);
    }
});
