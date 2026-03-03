import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { sendLinePush } from "../lib/line.js";
import { parsePagination, paginatedJson } from "../lib/pagination.js";

export const notificationsRouter = new Hono();

// GET /api/notifications — รายการแจ้งเตือนทั้งหมด
notificationsRouter.get("/", async (c) => {
    try {
        const params = parsePagination(c);
        const statusFilter = c.req.query("status");
        const where: any = {};
        if (statusFilter && statusFilter !== "ALL") { where.status = statusFilter; }

        const [total, items] = await Promise.all([
            prisma.notification.count({ where }),
            prisma.notification.findMany({
                where,
                include: { job: { select: { jobNo: true, customerName: true, carBrand: true, carModel: true, plateNo: true } } },
                orderBy: { createdAt: "desc" },
                skip: params.skip,
                take: params.pageSize,
            }),
        ]);

        return c.json(paginatedJson(items, total, params));
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถโหลดรายการได้" }, 500);
    }
});

// POST /api/notifications/:id/retry — ส่งซ้ำ (FAILED → ลองใหม่)
notificationsRouter.post("/:id/retry", async (c) => {
    try {
        const { id } = c.req.param();
        const notif = await prisma.notification.findUnique({ where: { id } });
        if (!notif) return c.json({ success: false, error: "ไม่พบแจ้งเตือนนี้" }, 404);
        if (notif.status === "SENT") return c.json({ success: false, error: "แจ้งเตือนนี้ส่งสำเร็จแล้ว" }, 400);

        const result = await sendLinePush(notif.recipient, notif.message);

        const updated = await prisma.notification.update({
            where: { id },
            data: {
                status: result.ok ? "SENT" : "FAILED",
                error: result.ok ? null : result.error,
                sentAt: result.ok ? new Date() : null,
            },
        });

        return c.json({ success: true, data: updated });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถส่งซ้ำได้" }, 500);
    }
});

// POST /api/notifications/send — ส่ง manual (เลือก Job + ข้อความ)
notificationsRouter.post("/send", async (c) => {
    try {
        const { jobId, message } = await c.req.json();
        if (!jobId || !message) return c.json({ success: false, error: "กรุณาระบุ jobId และ message" }, 400);

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { claim: { select: { lineUserId: true } } },
        });
        if (!job) return c.json({ success: false, error: "ไม่พบ Job" }, 404);

        const lineUserId = job.claim?.lineUserId;
        let notifStatus = "SENT";
        let notifError: string | undefined;

        if (lineUserId) {
            const result = await sendLinePush(lineUserId, message);
            if (!result.ok) { notifStatus = "FAILED"; notifError = result.error; }
        } else {
            notifStatus = "FAILED";
            notifError = "ไม่พบ LINE userId (ลูกค้ายังไม่ลงทะเบียน)";
        }

        const notif = await prisma.notification.create({
            data: {
                jobId,
                type: "MANUAL",
                channel: "LINE",
                recipient: lineUserId || job.customerPhone || "-",
                message,
                status: notifStatus,
                error: notifError,
                sentAt: notifStatus === "SENT" ? new Date() : null,
            },
        });

        return c.json({ success: true, data: notif });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถส่งแจ้งเตือนได้" }, 500);
    }
});
