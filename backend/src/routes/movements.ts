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

// POST /api/movements/batch — เบิก/เพิ่มอะไหล่หลายรายการพร้อมกัน (ต้อง login)
const batchSchema = z.object({
    type: z.enum(["IN", "OUT"]).default("OUT"),
    items: z.array(z.object({
        partId: z.string().min(1),
        quantity: z.number().int().min(1),
        reason: z.string().optional(),
    })).min(1, "ต้องมีอย่างน้อย 1 รายการ"),
    reason: z.string().optional(),
});

movementsRouter.post("/batch", requireAuth(), zValidator("json", batchSchema), async (c) => {
    try {
        const { type, items, reason: globalReason } = c.req.valid("json");
        const user = (c as any).get("user");

        const partIds = items.map(i => i.partId);
        const parts = await prisma.part.findMany({ where: { id: { in: partIds } } });
        const partMap = new Map(parts.map(p => [p.id, p]));

        const errors: string[] = [];
        for (const item of items) {
            const part = partMap.get(item.partId);
            if (!part) { errors.push(`ไม่พบอะไหล่ ID: ${item.partId}`); continue; }
            if (type === "OUT" && part.quantity < item.quantity) {
                errors.push(`${part.name}: สต็อกไม่เพียงพอ (มี ${part.quantity} ${part.unit}, ต้องการ ${item.quantity})`);
            }
        }
        if (errors.length > 0) return c.json({ success: false, error: errors.join("\n"), errors }, 400);

        const ops = items.flatMap(item => [
            prisma.stockMovement.create({
                data: { partId: item.partId, type, quantity: item.quantity, reason: item.reason || globalReason || null, userId: user.id },
            }),
            prisma.part.update({
                where: { id: item.partId },
                data: { quantity: type === "IN" ? { increment: item.quantity } : { decrement: item.quantity } },
            }),
        ]);
        await prisma.$transaction(ops);

        // After OUT: check for low stock and notify LINE
        if (type === "OUT") {
            try {
                const updatedParts = await prisma.part.findMany({ where: { id: { in: partIds } } });
                const lowStockParts = updatedParts.filter(p => p.quantity <= p.minStock);
                if (lowStockParts.length > 0) {
                    const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
                    const LINE_ADMIN_GROUP = process.env.LINE_ADMIN_GROUP_ID;
                    if (LINE_TOKEN && LINE_ADMIN_GROUP) {
                        const lines = lowStockParts.map(p =>
                            `⚠️ ${p.name} (${p.code}) เหลือ ${p.quantity} ${p.unit} (ต่ำสุด: ${p.minStock})`
                        );
                        const message = `🔴 แจ้งเตือนสต็อกใกล้หมด\n\n${lines.join("\n")}\n\nผู้เบิก: ${user.name}\nเหตุผล: ${globalReason || "-"}`;
                        fetch("https://api.line.me/v2/bot/message/push", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_TOKEN}` },
                            body: JSON.stringify({ to: LINE_ADMIN_GROUP, messages: [{ type: "text", text: message }] }),
                        }).catch(e => console.error("[LINE Notify] Error:", e));
                    }
                }
            } catch (e) { console.error("[LowStock Check]", e); }
        }

        // Record audit log
        try {
            await prisma.auditLog.create({
                data: {
                    action: type === "OUT" ? "BATCH_OUT" : "BATCH_IN",
                    entity: "StockMovement",
                    details: JSON.stringify({
                        items: items.map(i => ({ partId: i.partId, qty: i.quantity, name: partMap.get(i.partId)?.name })),
                        reason: globalReason || null,
                    }),
                    userId: user.id,
                },
            });
        } catch (e) { console.error("[AuditLog]", e); }

        return c.json({ success: true, data: { type, count: items.length, items: items.map(i => ({ partId: i.partId, quantity: i.quantity, name: partMap.get(i.partId)?.name })) } }, 201);
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถบันทึกรายการได้" }, 500);
    }
});
