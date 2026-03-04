import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";

export const lineRouter = new Hono();


// GET /api/line/status — ภาพรวม LINE OA (Job-based)
lineRouter.get("/status", requireAuth(), async (c) => {
    try {
        // อ่าน env ทุก request เพื่อไม่ติดปัญหา module-level cache
        const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const LINE_SECRET = process.env.LINE_CHANNEL_SECRET;

        // ตรวจสอบ token กับ LINE API
        let botProfile: any = null;
        let tokenValid = false;

        if (LINE_TOKEN) {
            try {
                const res = await fetch("https://api.line.me/v2/bot/info", {
                    headers: { Authorization: `Bearer ${LINE_TOKEN}` },
                });
                if (res.ok) {
                    botProfile = await res.json();
                    tokenValid = true;
                }
            } catch { }
        }

        // Stats จาก Jobs
        const activeStatuses = ["WAITING_PARTS", "RECEIVED", "IN_PROGRESS", "COMPLETED"] as any;
        const [totalJobs, activeJobs, linkedJobs, activeLinked] = await Promise.all([
            prisma.job.count(),
            prisma.job.count({ where: { status: { in: activeStatuses } } }),
            prisma.job.count({ where: { lineUserId: { not: null } } }),
            prisma.job.count({
                where: { status: { in: activeStatuses }, lineUserId: { not: null } },
            }),
        ]);

        // Jobs ที่ลิงก์ LINE แล้ว (ล่าสุด)
        const recentLinked = await prisma.job.findMany({
            where: { lineUserId: { not: null } },
            orderBy: { lineLinkedAt: "desc" },
            take: 10,
            select: {
                id: true, jobNo: true, customerName: true,
                plateNo: true, carBrand: true, carModel: true,
                status: true, lineUserId: true, lineLinkedAt: true,
                insuranceComp: true,
            },
        });

        // Active Jobs ที่ยังไม่ลิงก์ LINE
        const unlinked = await prisma.job.findMany({
            where: { status: { in: activeStatuses }, lineUserId: null },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true, jobNo: true, customerName: true,
                plateNo: true, carBrand: true, carModel: true,
                status: true, insuranceComp: true,
            },
        });

        return c.json({
            success: true,
            data: {
                config: {
                    hasToken: !!LINE_TOKEN,
                    hasSecret: !!LINE_SECRET,
                    tokenValid,
                    botProfile,
                    webhookUrl: "https://api.nunmechanic.com/webhook/line",
                },
                stats: {
                    totalClaims: totalJobs,
                    linkedClaims: linkedJobs,
                    activeClaims: activeJobs,
                    activeLinked,
                    linkRate: activeJobs > 0 ? Math.round((activeLinked / activeJobs) * 100) : 0,
                },
                recentLinked,
                unlinked,
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error?.message }, 500);
    }
});

// POST /api/line/test-push — ส่ง test message ไปหา lineUserId ที่ระบุ
lineRouter.post("/test-push", requireAuth(), async (c) => {
    try {
        const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN; // อ่านทุก request
        const { lineUserId, message } = await c.req.json();
        if (!lineUserId) return c.json({ success: false, error: "กรุณาระบุ lineUserId" }, 400);
        if (!LINE_TOKEN) return c.json({ success: false, error: "ไม่มี LINE_CHANNEL_ACCESS_TOKEN" }, 400);

        const text = message || "🔔 ทดสอบระบบแจ้งเตือน LINE OA จาก นันการช่าง ✅";


        const res = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LINE_TOKEN}`,
            },
            body: JSON.stringify({
                to: lineUserId,
                messages: [{ type: "text", text }],
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as any;
            return c.json({ success: false, error: err?.message || `LINE API ${res.status}` }, 400);
        }

        return c.json({ success: true, message: "ส่งสำเร็จ!" });
    } catch (e: any) {
        return c.json({ success: false, error: e?.message }, 500);
    }
});
