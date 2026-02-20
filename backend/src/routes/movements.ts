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
