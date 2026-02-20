import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { parsePagination, paginatedJson } from "../lib/pagination.js";

export const claimsRouter = new Hono();

const claimItemSchema = z.object({
    partId: z.string().optional(),
    partName: z.string().min(1, "กรุณาระบุชื่ออะไหล่"),
    quantity: z.number().int().min(1),
});

const claimSchema = z.object({
    claimNo: z.string().min(1, "กรุณาระบุเลขเคลม"),
    customerName: z.string().min(1, "กรุณาระบุชื่อลูกค้า"),
    customerPhone: z.string().min(1, "กรุณาระบุเบอร์โทร"),
    carBrand: z.string().min(1, "กรุณาระบุยี่ห้อรถ"),
    carModel: z.string().min(1, "กรุณาระบุรุ่นรถ"),
    plateNo: z.string().min(1, "กรุณาระบุทะเบียน"),
    insuranceComp: z.string().min(1, "กรุณาระบุบริษัทประกัน"),
    jobNo: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(claimItemSchema).min(1, "กรุณาเพิ่มอะไหล่อย่างน้อย 1 รายการ"),
});

// GET /api/claims - ดึงรายการเคลมทั้งหมด (paginated)
claimsRouter.get("/", async (c) => {
    try {
        const { status, search } = c.req.query();
        const pag = parsePagination(c);

        const where: any = {
            ...(status && { status: status as any }),
            ...(search && {
                OR: [
                    { claimNo: { contains: search, mode: "insensitive" } },
                    { customerName: { contains: search, mode: "insensitive" } },
                    { customerPhone: { contains: search } },
                    { plateNo: { contains: search, mode: "insensitive" } },
                ],
            }),
        };

        const [claims, total] = await Promise.all([
            prisma.insuranceClaim.findMany({
                where,
                include: { items: { include: { part: true } } },
                orderBy: { createdAt: "desc" },
                skip: pag.skip,
                take: pag.take,
            }),
            prisma.insuranceClaim.count({ where }),
        ]);

        return c.json(paginatedJson(claims, total, pag));
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลเคลมได้" }, 500);
    }
});

// GET /api/claims/:id
claimsRouter.get("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        const claim = await prisma.insuranceClaim.findUnique({
            where: { id },
            include: { items: { include: { part: true } } },
        });
        if (!claim) return c.json({ success: false, error: "ไม่พบการเคลมนี้" }, 404);
        return c.json({ success: true, data: claim });
    } catch (error) {
        return c.json({ success: false, error: "เกิดข้อผิดพลาด" }, 500);
    }
});

// POST /api/claims - สร้างเคลมใหม่
claimsRouter.post("/", zValidator("json", claimSchema), async (c) => {
    try {
        const { items, ...claimData } = c.req.valid("json");
        const claim = await prisma.insuranceClaim.create({
            data: {
                ...claimData,
                items: { create: items },
            },
            include: { items: { include: { part: true } } },
        });
        return c.json({ success: true, data: claim }, 201);
    } catch (error: any) {
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "เลขเคลมนี้มีอยู่แล้ว" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถสร้างเคลมได้" }, 500);
    }
});

// PATCH /api/claims/:id/status - อัพเดตสถานะ
claimsRouter.patch("/:id/status", async (c) => {
    try {
        const { id } = c.req.param();
        const { status } = await c.req.json();

        const validStatuses = ["PENDING", "ORDERED", "ARRIVED", "NOTIFIED", "COMPLETED"];
        if (!validStatuses.includes(status)) {
            return c.json({ success: false, error: "สถานะไม่ถูกต้อง" }, 400);
        }

        const updateData: any = { status };
        if (status === "ARRIVED") updateData.arrivedAt = new Date();
        if (status === "NOTIFIED") updateData.notifiedAt = new Date();

        const claim = await prisma.insuranceClaim.update({
            where: { id },
            data: updateData,
            include: { items: { include: { part: true } } },
        });
        return c.json({ success: true, data: claim });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถอัพเดตสถานะได้" }, 500);
    }
});

// POST /api/claims/:id/notify - แจ้งเตือนลูกค้า (LINE OA placeholder)
claimsRouter.post("/:id/notify", async (c) => {
    try {
        const { id } = c.req.param();
        const claim = await prisma.insuranceClaim.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!claim) return c.json({ success: false, error: "ไม่พบการเคลมนี้" }, 404);
        if (claim.status !== "ARRIVED" && claim.status !== "ORDERED") {
            return c.json({ success: false, error: "ยังไม่สามารถแจ้งเตือนได้ อะไหล่ยังไม่มาถึง" }, 400);
        }

        const updated = await prisma.insuranceClaim.update({
            where: { id },
            data: {
                status: "NOTIFIED",
                notifiedAt: new Date(),
                notifyChannel: "LINE_OA",
            },
        });

        return c.json({
            success: true,
            data: updated,
            message: `[พร้อมส่ง LINE OA] แจ้งเตือน ${claim.customerName} (${claim.customerPhone}) ว่าอะไหล่มาถึงแล้ว`,
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถส่งการแจ้งเตือนได้" }, 500);
    }
});

// DELETE /api/claims/:id
claimsRouter.delete("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        await prisma.insuranceClaim.delete({ where: { id } });
        return c.json({ success: true, message: "ลบเคลมเรียบร้อย" });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถลบเคลมได้" }, 500);
    }
});
