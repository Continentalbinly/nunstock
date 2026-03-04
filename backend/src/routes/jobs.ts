import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { sendLinePush } from "../lib/line.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { parsePagination, paginatedJson } from "../lib/pagination.js";

export const jobsRouter = new Hono();

// ---- Schemas ----
const createSchema = z.object({
    jobNo: z.string().min(1, "กรุณาระบุเลข Job"),
    type: z.enum(["INSURANCE", "CASH"]),
    customerName: z.string().min(1, "กรุณาระบุชื่อลูกค้า"),
    customerPhone: z.string().optional(),
    carBrand: z.string().min(1, "กรุณาระบุยี่ห้อรถ"),
    carModel: z.string().min(1, "กรุณาระบุรุ่นรถ"),
    plateNo: z.string().min(1, "กรุณาระบุทะเบียน"),
    notes: z.string().optional(),

    claimNo: z.string().optional(),
    insuranceComp: z.string().optional(),
});

const updateSchema = z.object({
    customerName: z.string().min(1).optional(),
    customerPhone: z.string().optional().nullable(),
    carBrand: z.string().min(1).optional(),
    carModel: z.string().min(1).optional(),
    plateNo: z.string().min(1).optional(),
    notes: z.string().optional().nullable(),

    claimNo: z.string().optional().nullable(),
    insuranceComp: z.string().optional().nullable(),
});

const statusSchema = z.object({
    status: z.enum(["RECEIVED", "WAITING_PARTS", "IN_PROGRESS", "COMPLETED", "DELIVERED", "CLOSED"]),
});

const addPartSchema = z.object({
    source: z.enum(["SHOP_PART", "INSURANCE_PART", "SHOP_STOCK", "CONSUMABLE", "PAINT", "EXTERNAL"]),
    sourceId: z.string().optional(),
    partName: z.string().min(1, "กรุณาระบุชื่ออะไหล่"),
    quantity: z.number().int().min(1, "จำนวนต้องมากกว่า 0"),
    unit: z.string().optional(),
    note: z.string().optional(),
    withdrawnBy: z.string().optional(),
});

// ---- Auto Job Number ----
async function generateJobNo(): Promise<string> {
    const now = new Date();
    const prefix = `JOB-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const count = await prisma.job.count({
        where: { jobNo: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

// GET /api/jobs/suggestions — distinct values for autocomplete (merges Jobs, InsuranceClaims, ShopStock, Parts)
jobsRouter.get("/suggestions", async (c) => {
    try {
        const field = c.req.query("field");
        const q = (c.req.query("q") || "").trim();
        if (!field || !q) return c.json({ success: true, data: { suggestions: [] } });

        const contains = { contains: q, mode: "insensitive" as const };
        const allValues: string[] = [];

        // Jobs — always search
        if (["customerName", "carBrand", "carModel", "plateNo", "insuranceComp", "customerPhone"].includes(field)) {
            const rows = await prisma.job.findMany({
                where: { [field]: contains }, select: { [field]: true }, distinct: [field as any], take: 10, orderBy: { createdAt: "desc" },
            });
            rows.forEach((r: any) => r[field] && allValues.push(r[field]));
        }



        // ShopStock — carBrand, carModel
        if (["carBrand", "carModel"].includes(field)) {
            const rows = await prisma.shopStock.findMany({
                where: { [field]: contains }, select: { [field]: true }, distinct: [field as any], take: 10, orderBy: { createdAt: "desc" },
            });
            rows.forEach((r: any) => r[field] && allValues.push(r[field]));
        }

        // Parts — brand maps to carBrand too
        if (field === "carBrand") {
            const rows = await prisma.part.findMany({
                where: { brand: contains }, select: { brand: true }, distinct: ["brand"], take: 10, orderBy: { createdAt: "desc" },
            });
            rows.forEach((r: any) => r.brand && allValues.push(r.brand));
        }

        // Deduplicate (case-insensitive) and limit
        const seen = new Set<string>();
        const suggestions = allValues.filter(v => {
            const lower = v.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        }).slice(0, 15);

        return c.json({ success: true, data: { suggestions } });
    } catch (err: any) {
        return c.json({ success: true, data: { suggestions: [] } });
    }
});

// GET /api/jobs/summary
jobsRouter.get("/summary", async (c) => {
    try {
        const [byStatus, byType] = await Promise.all([
            prisma.job.groupBy({ by: ["status"], _count: true }),
            prisma.job.groupBy({ by: ["type"], _count: true }),
        ]);

        const statusMap: Record<string, number> = {};
        byStatus.forEach((s) => (statusMap[s.status] = s._count));
        const typeMap: Record<string, number> = {};
        byType.forEach((t) => (typeMap[t.type] = t._count));

        return c.json({
            success: true,
            data: {
                total: Object.values(statusMap).reduce((a, b) => a + b, 0),
                byStatus: statusMap,
                byType: typeMap,
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลสรุปได้" }, 500);
    }
});

// GET /api/jobs
jobsRouter.get("/", async (c) => {
    try {
        const { search, status, type } = c.req.query();
        const pag = parsePagination(c);
        const where: any = {};

        if (search) {
            where.OR = [
                { jobNo: { contains: search, mode: "insensitive" } },
                { customerName: { contains: search, mode: "insensitive" } },
                { plateNo: { contains: search, mode: "insensitive" } },
                { carBrand: { contains: search, mode: "insensitive" } },
                { carModel: { contains: search, mode: "insensitive" } },
            ];
        }
        if (status) where.status = status;
        if (type) where.type = type;

        const [items, total] = await Promise.all([
            prisma.job.findMany({
                where,
                include: {
                    _count: { select: { parts: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: pag.skip,
                take: pag.take,
            }),
            prisma.job.count({ where }),
        ]);

        return c.json(paginatedJson(items, total, pag));
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลได้" }, 500);
    }
});

// GET /api/jobs/:id
// ─── Repair Step Templates ─────
jobsRouter.get("/repair-step-templates", async (c) => {
    const templates = await prisma.repairStepTemplate.findMany({ orderBy: { label: "asc" } });
    return c.json({ success: true, data: templates });
});

// ─── Job Part Barcode Lookup ─────
jobsRouter.get("/parts/lookup/:barcode", async (c) => {
    try {
        const { barcode } = c.req.param();
        const jobPart = await prisma.jobPart.findUnique({
            where: { barcode },
            include: { job: { select: { id: true, jobNo: true, customerName: true, carBrand: true, carModel: true, plateNo: true, status: true } } },
        });
        if (!jobPart) return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
        return c.json({ success: true, data: jobPart });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถค้นหาได้" }, 500);
    }
});

// ─── Active Jobs (for consumable scanner) ─────
jobsRouter.get("/active-jobs", async (c) => {
    const jobs = await prisma.job.findMany({
        where: { status: { in: ["IN_PROGRESS", "RECEIVED", "WAITING_PARTS"] } },
        select: { id: true, jobNo: true, customerName: true, carBrand: true, carModel: true, plateNo: true, status: true },
        orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, data: jobs });
});

jobsRouter.get("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        const job = await prisma.job.findUnique({
            where: { id },
            include: {
                parts: { orderBy: { addedAt: "desc" } },
                repairSteps: { orderBy: { order: "asc" } },
            },
        });
        if (!job) return c.json({ success: false, error: "ไม่พบ Job นี้" }, 404);
        return c.json({ success: true, data: job });
    } catch (error) {
        return c.json({ success: false, error: "เกิดข้อผิดพลาด" }, 500);
    }
});

// POST /api/jobs
jobsRouter.post("/", zValidator("json", createSchema), async (c) => {
    try {
        const body = c.req.valid("json");

        // Auto-generate job number if "AUTO"
        const jobNo = body.jobNo === "AUTO" ? await generateJobNo() : body.jobNo;



        const job = await prisma.job.create({
            data: {
                ...body, jobNo,

            },
            include: {
                parts: true,
                _count: { select: { parts: true } },
            },
        });
        return c.json({ success: true, data: job }, 201);
    } catch (error: any) {
        if (error?.code === "P2002") return c.json({ success: false, error: "เลข Job นี้มีอยู่แล้ว" }, 400);
        return c.json({ success: false, error: "ไม่สามารถสร้าง Job ได้" }, 500);
    }
});

// PATCH /api/jobs/:id
jobsRouter.patch("/:id", zValidator("json", updateSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const body = c.req.valid("json");
        const existing = await prisma.job.findUnique({ where: { id } });
        if (!existing) return c.json({ success: false, error: "ไม่พบ Job นี้" }, 404);

        const job = await prisma.job.update({
            where: { id },
            data: body,
            include: {},
        });
        return c.json({ success: true, data: job });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถแก้ไขได้" }, 500);
    }
});

// PATCH /api/jobs/:id/status — เปลี่ยนสถานะ (auto timestamps + auto log)
jobsRouter.patch("/:id/status", zValidator("json", statusSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const { status } = c.req.valid("json");
        const existing = await prisma.job.findUnique({ where: { id } });
        if (!existing) return c.json({ success: false, error: "ไม่พบ Job นี้" }, 404);

        const updateData: any = { status };
        const now = new Date();
        if (status === "IN_PROGRESS" && !existing.startedAt) { updateData.startedAt = now; }
        if (status === "COMPLETED" && !existing.completedAt) { updateData.completedAt = now; }
        if (status === "DELIVERED" && !existing.deliveredAt) updateData.deliveredAt = now;
        if (status === "CLOSED" && !existing.closedAt) updateData.closedAt = now;

        const [job] = await prisma.$transaction([
            prisma.job.update({
                where: { id },
                data: updateData,
                include: { _count: { select: { parts: true } } },
            }),
            prisma.jobStatusLog.create({
                data: {
                    jobId: id,
                    fromStatus: existing.status,
                    toStatus: status,
                    changedAt: now,
                },
            }),
        ]);
        return c.json({ success: true, data: job });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเปลี่ยนสถานะได้" }, 500);
    }
});

// POST /api/jobs/:id/notes — เพิ่มหมายเหตุ
jobsRouter.post("/:id/notes", async (c) => {
    try {
        const { id } = c.req.param();
        const { note } = await c.req.json();
        if (!note || typeof note !== "string" || !note.trim()) return c.json({ success: false, error: "กรุณากรอกหมายเหตุ" }, 400);
        const job = await prisma.job.findUnique({ where: { id } });
        if (!job) return c.json({ success: false, error: "ไม่พบ Job" }, 404);
        const created = await prisma.jobNote.create({ data: { jobId: id, note: note.trim() } });
        return c.json({ success: true, data: created });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเพิ่มหมายเหตุได้" }, 500);
    }
});

// GET /api/jobs/:id/notes — ดูหมายเหตุทั้งหมด
jobsRouter.get("/:id/notes", async (c) => {
    try {
        const { id } = c.req.param();
        const notes = await prisma.jobNote.findMany({ where: { jobId: id }, orderBy: { createdAt: "desc" } });
        return c.json({ success: true, data: notes });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงหมายเหตุได้" }, 500);
    }
});

// POST /api/jobs/:id/claim-call — บันทึกว่าแจ้งเคลมแล้ว
jobsRouter.post("/:id/claim-call", async (c) => {
    try {
        const { id } = c.req.param();
        const job = await prisma.job.findUnique({ where: { id } });
        if (!job) return c.json({ success: false, error: "ไม่พบ Job" }, 404);
        if (job.type !== "INSURANCE") return c.json({ success: false, error: "Job นี้ไม่ใช่งานประกัน" }, 400);
        const now = new Date();
        const [updated] = await prisma.$transaction([
            prisma.job.update({ where: { id }, data: { claimCalledAt: now } }),
            prisma.jobStatusLog.create({
                data: { jobId: id, fromStatus: job.status, toStatus: job.status, changedAt: now, notes: "แจ้งเคลม" },
            }),
        ]);
        return c.json({ success: true, data: updated });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถบันทึกได้" }, 500);
    }
});

// POST /api/jobs/:id/repair-steps — เพิ่มขั้นตอนซ่อม
const addRepairStepSchema = z.object({
    step: z.string().min(1),
    label: z.string().min(1),
});
jobsRouter.post("/:id/repair-steps", zValidator("json", addRepairStepSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const body = c.req.valid("json");
        // Auto-create template if not exists
        await prisma.repairStepTemplate.upsert({
            where: { label: body.label },
            update: {},
            create: { label: body.label },
        });
        // Get max order
        const maxOrder = await prisma.jobRepairStep.aggregate({ where: { jobId: id }, _max: { order: true } });
        const newOrder = (maxOrder._max.order ?? -1) + 1;
        const step = await prisma.jobRepairStep.create({
            data: { jobId: id, step: body.step, label: body.label, order: newOrder },
        });
        return c.json({ success: true, data: step }, 201);
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเพิ่มขั้นตอนได้" }, 500);
    }
});

// DELETE /api/jobs/:id/repair-steps/:stepId — ลบขั้นตอน
jobsRouter.delete("/:id/repair-steps/:stepId", async (c) => {
    try {
        const { stepId } = c.req.param();
        const step = await prisma.jobRepairStep.findUnique({ where: { id: stepId } });
        if (!step) return c.json({ success: false, error: "ไม่พบขั้นตอนนี้" }, 404);
        if (step.status !== "PENDING") return c.json({ success: false, error: "ไม่สามารถลบขั้นตอนที่เริ่มแล้ว" }, 400);
        await prisma.jobRepairStep.delete({ where: { id: stepId } });
        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถลบขั้นตอนได้" }, 500);
    }
});

// PATCH /api/jobs/:id/repair-steps/:stepId/advance — เลื่อนสถานะ (ย้อนไม่ได้)
jobsRouter.patch("/:id/repair-steps/:stepId/advance", async (c) => {
    try {
        const { stepId } = c.req.param();
        const step = await prisma.jobRepairStep.findUnique({ where: { id: stepId } });
        if (!step) return c.json({ success: false, error: "ไม่พบขั้นตอนนี้" }, 404);

        const nextStatus: Record<string, string> = { PENDING: "IN_PROGRESS", IN_PROGRESS: "COMPLETED" };
        const next = nextStatus[step.status];
        if (!next) return c.json({ success: false, error: "ขั้นตอนนี้เสร็จแล้ว" }, 400);

        const updated = await prisma.jobRepairStep.update({
            where: { id: stepId },
            data: { status: next as any },
        });
        return c.json({ success: true, data: updated });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเลื่อนสถานะได้" }, 500);
    }
});

// PATCH /api/jobs/:id/repair-steps/reorder — จัดลำดับใหม่
jobsRouter.patch("/:id/repair-steps/reorder", async (c) => {
    try {
        const { id } = c.req.param();
        const { order } = await c.req.json(); // order = ["stepId1", "stepId2", ...]
        if (!Array.isArray(order)) return c.json({ success: false, error: "order ต้องเป็น array" }, 400);
        await Promise.all(order.map((stepId: string, i: number) =>
            prisma.jobRepairStep.update({ where: { id: stepId, jobId: id }, data: { order: i } })
        ));
        const job = await prisma.job.findUnique({ where: { id }, include: { parts: true, repairSteps: { orderBy: { order: "asc" } } } });
        return c.json({ success: true, data: job });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถจัดลำดับได้" }, 500);
    }
});

// POST /api/jobs/:id/parts — เพิ่มอะไหล่เข้า Job (ตัดสต็อกอัตโนมัติ)
jobsRouter.post("/:id/parts", zValidator("json", addPartSchema), async (c) => {
    try {
        const { id } = c.req.param();
        const body = c.req.valid("json");

        const job = await prisma.job.findUnique({ where: { id } });
        if (!job) return c.json({ success: false, error: "ไม่พบ Job นี้" }, 404);

        // ตัดสต็อกตามแหล่งที่มา
        if (body.source === "SHOP_STOCK" && body.sourceId) {
            // ตัดจาก ShopStock
            const stock = await prisma.shopStock.findUnique({ where: { id: body.sourceId } });
            if (!stock) return c.json({ success: false, error: "ไม่พบอะไหล่ในสต็อกอู่" }, 404);
            if (stock.quantity < body.quantity) return c.json({ success: false, error: `สต็อกไม่พอ (เหลือ ${stock.quantity} ${stock.unit})` }, 400);

            await prisma.$transaction([
                prisma.shopStock.update({ where: { id: body.sourceId }, data: { quantity: { decrement: body.quantity } } }),
                prisma.shopStockUsage.create({ data: { shopStockId: body.sourceId, quantity: body.quantity, jobNo: job.jobNo, note: `ใช้ใน Job ${job.jobNo}` } }),
            ]);
        } else if (["SHOP_PART", "CONSUMABLE", "PAINT"].includes(body.source) && body.sourceId) {
            // ตัดจาก Part (หน้าร้าน / วัสดุสิ้นเปลือง / สี) — ไม่รวม INSURANCE_PART เพราะเป็น catalog
            const part = await prisma.part.findUnique({ where: { id: body.sourceId } });
            if (!part) return c.json({ success: false, error: "ไม่พบอะไหล่นี้" }, 404);
            if (part.quantity < body.quantity) return c.json({ success: false, error: `สต็อกไม่พอ (เหลือ ${part.quantity} ${part.unit})` }, 400);

            await prisma.part.update({ where: { id: body.sourceId }, data: { quantity: { decrement: body.quantity } } });
        }
        // INSURANCE_PART — ไม่ตัดสต็อก (เป็นแค่ catalog อ้างอิง)
        // EXTERNAL — ไม่ตัดสต็อก

        const jobPart = await prisma.jobPart.create({
            data: { jobId: id, ...body },
        });

        return c.json({ success: true, data: jobPart }, 201);
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเพิ่มอะไหล่ได้" }, 500);
    }
});

// DELETE /api/jobs/:id/parts/:partId — ลบอะไหล่ออก (คืนสต็อก)
jobsRouter.delete("/:id/parts/:partId", async (c) => {
    try {
        const { id, partId } = c.req.param();

        const jobPart = await prisma.jobPart.findUnique({ where: { id: partId } });
        if (!jobPart || jobPart.jobId !== id) return c.json({ success: false, error: "ไม่พบรายการนี้" }, 404);

        // คืนสต็อก
        if (jobPart.source === "SHOP_STOCK" && jobPart.sourceId) {
            await prisma.shopStock.update({ where: { id: jobPart.sourceId }, data: { quantity: { increment: jobPart.quantity } } });
        } else if (["SHOP_PART", "CONSUMABLE", "PAINT"].includes(jobPart.source) && jobPart.sourceId) {
            await prisma.part.update({ where: { id: jobPart.sourceId }, data: { quantity: { increment: jobPart.quantity } } });
        }

        await prisma.jobPart.delete({ where: { id: partId } });
        return c.json({ success: true, message: "ลบอะไหล่เรียบร้อย (คืนสต็อกแล้ว)" });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถลบได้" }, 500);
    }
});

// PATCH /api/jobs/:id/parts/:partId/status — เปลี่ยนสถานะอะไหล่ (ORDERED→ARRIVED→WITHDRAWN→INSTALLED)
jobsRouter.patch("/:id/parts/:partId/status", async (c) => {
    try {
        const { id, partId } = c.req.param();
        const { status } = await c.req.json();

        const valid = ["ORDERED", "ARRIVED", "WITHDRAWN", "INSTALLED"];
        if (!valid.includes(status)) return c.json({ success: false, error: "สถานะไม่ถูกต้อง" }, 400);

        const jobPart = await prisma.jobPart.findUnique({ where: { id: partId } });
        if (!jobPart || jobPart.jobId !== id) return c.json({ success: false, error: "ไม่พบรายการนี้" }, 404);

        // Auto-generate barcode when ARRIVED (non-consumable only)
        let barcode = jobPart.barcode;
        if (status === "ARRIVED" && !barcode && jobPart.source !== "CONSUMABLE" && jobPart.source !== "PAINT") {
            const job = await prisma.job.findUnique({ where: { id }, select: { jobNo: true } });
            const existingCount = await prisma.jobPart.count({ where: { jobId: id, barcode: { not: null } } });
            barcode = `JP-${job?.jobNo || id.slice(-6)}-${String(existingCount + 1).padStart(3, "0")}`;
        }

        const updated = await prisma.jobPart.update({
            where: { id: partId },
            data: { status, ...(barcode && !jobPart.barcode ? { barcode } : {}) },
        });

        // ── Auto-trigger: ถ้าอะไหล่ทุกชิ้นมาครบ → แจ้งลูกค้า + เปลี่ยนเป็น RECEIVED ──
        if (status === "ARRIVED") {
            const job = await prisma.job.findUnique({
                where: { id },
                include: {
                    parts: true,
                },
            });
            if (job && job.status === "WAITING_PARTS") {
                const nonConsumableParts = job.parts.filter(p => p.source !== "CONSUMABLE" && p.source !== "PAINT");
                const allArrived = nonConsumableParts.length > 0 && nonConsumableParts.every(p => p.status === "ARRIVED" || p.status === "WITHDRAWN" || p.status === "INSTALLED");
                if (allArrived) {
                    // Build notification message
                    const msg = [
                        `🎉 อะไหล่มาครบแล้ว!`,
                        `📋 Job: ${job.jobNo}`,
                        `🚗 ${job.carBrand} ${job.carModel} (${job.plateNo})`,
                        job.insuranceComp ? `🏢 ประกัน: ${job.insuranceComp}` : null,
                        ``,
                        `📦 อะไหล่ทั้งหมด:`,
                        ...nonConsumableParts.map(p => `✅ ${p.partName} x${p.quantity}`),
                        ``,
                        `กรุณานำรถเข้ามาที่อู่เพื่อเริ่มซ่อมครับ 🙏`,
                    ].filter(Boolean).join("\n");

                    const lineUserId = job.lineUserId;
                    let notifStatus = "SENT";
                    let notifError: string | undefined;

                    if (lineUserId) {
                        const result = await sendLinePush(lineUserId, msg);
                        if (!result.ok) { notifStatus = "FAILED"; notifError = result.error; }
                    } else {
                        notifStatus = "FAILED";
                        notifError = "ไม่พบ LINE userId (ลูกค้ายังไม่ลงทะเบียน)";
                    }

                    // Create notification record
                    await prisma.notification.create({
                        data: {
                            jobId: id,
                            type: "PARTS_ARRIVED",
                            channel: "LINE",
                            recipient: lineUserId || job.customerPhone || "-",
                            message: msg,
                            status: notifStatus,
                            error: notifError,
                            sentAt: notifStatus === "SENT" ? new Date() : null,
                        },
                    });

                    // Auto-advance to RECEIVED
                    await prisma.job.update({
                        where: { id },
                        data: { status: "RECEIVED" },
                    });
                }
            }
        }

        return c.json({ success: true, data: updated });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถเปลี่ยนสถานะได้" }, 500);
    }
});

// PATCH /api/jobs/:id/cancel — ยกเลิก Job (เก็บเหตุผล + โอนอะไหล่ไปสต็อกร้าน)
jobsRouter.patch("/:id/cancel", async (c) => {
    try {
        const { id } = c.req.param();
        const { reason } = await c.req.json();
        if (!reason?.trim()) return c.json({ success: false, error: "กรุณาระบุเหตุผลในการยกเลิก" }, 400);

        const existing = await prisma.job.findUnique({ where: { id }, include: { parts: true } });
        if (!existing) return c.json({ success: false, error: "ไม่พบ Job นี้" }, 404);
        if (existing.status === "CANCELLED") return c.json({ success: false, error: "Job นี้ถูกยกเลิกไปแล้ว" }, 400);

        // จัดการอะไหล่ — อะไหล่ที่มาถึงแล้วเข้าสต็อกร้าน, ที่ยังไม่มาคืนแหล่ง
        for (const part of existing.parts) {
            if (part.status === "ARRIVED" || part.status === "INSTALLED") {
                // อะไหล่ที่มาถึงแล้ว → สร้าง shop stock ใหม่ (ไม่ว่า source อะไร)
                if (part.source === "SHOP_STOCK" && part.sourceId) {
                    // คืนกลับ shop stock เดิม
                    await prisma.shopStock.update({ where: { id: part.sourceId }, data: { quantity: { increment: part.quantity } } }).catch(() => { });
                } else {
                    // ประกัน / หน้าร้าน / อื่นๆ → สร้างเป็น shop stock ใหม่
                    await prisma.shopStock.create({
                        data: {
                            name: part.partName,
                            quantity: part.quantity,
                            unit: part.unit || "ชิ้น",
                            source: "JOB_CANCEL",
                            sourceNote: `โอนจาก ${existing.jobNo} (${SOURCE_LABELS_TH[part.source] || part.source})`,
                        },
                    }).catch(() => { });
                }
            } else {
                // ยังไม่มา → คืน source เดิม
                if (part.source === "SHOP_STOCK" && part.sourceId) {
                    await prisma.shopStock.update({ where: { id: part.sourceId }, data: { quantity: { increment: part.quantity } } }).catch(() => { });
                } else if (["SHOP_PART", "INSURANCE_PART", "CONSUMABLE", "PAINT"].includes(part.source) && part.sourceId) {
                    await prisma.part.update({ where: { id: part.sourceId }, data: { quantity: { increment: part.quantity } } }).catch(() => { });
                }
            }
        }

        const updated = await prisma.job.update({
            where: { id },
            data: {
                status: "CANCELLED",
                cancelReason: reason.trim(),
                cancelledAt: new Date(),
            },
        });

        return c.json({ success: true, data: updated, message: "ยกเลิก Job เรียบร้อย" });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถยกเลิกได้" }, 500);
    }
});

const SOURCE_LABELS_TH: Record<string, string> = {
    SHOP_PART: "หน้าร้าน", INSURANCE_PART: "ประกัน",
    SHOP_STOCK: "สต็อกอู่", CONSUMABLE: "วัสดุสิ้นเปลือง", PAINT: "สี", EXTERNAL: "สั่งใหม่",
};
