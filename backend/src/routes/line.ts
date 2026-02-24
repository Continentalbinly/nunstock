import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";

export const lineRouter = new Hono();


// GET /api/line/status — ภาพรวม LINE OA
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


        // Stats จาก DB — lineUserId อาจยังไม่มี (migration ยังไม่รัน)
        let totalClaims = 0, linkedClaims = 0, activeClaims = 0, activeLinked = 0;
        let recentLinked: any[] = [];
        let unlinked: any[] = [];

        try {
            [totalClaims, activeClaims] = await Promise.all([
                prisma.insuranceClaim.count(),
                prisma.insuranceClaim.count({ where: { status: { not: "COMPLETED" } } }),
            ]);
        } catch { }

        // queries ที่ต้องใช้ lineUserId (อาจ fail ถ้ายังไม่ migrate)
        try {
            [linkedClaims, activeLinked] = await Promise.all([
                prisma.insuranceClaim.count({ where: { lineUserId: { not: null } } as any }),
                prisma.insuranceClaim.count({
                    where: { status: { not: "COMPLETED" }, lineUserId: { not: null } } as any,
                }),
            ]);

            recentLinked = await prisma.insuranceClaim.findMany({
                where: { lineUserId: { not: null } } as any,
                orderBy: { lineLinkedAt: "desc" } as any,
                take: 10,
                select: {
                    id: true, claimNo: true, customerName: true,
                    plateNo: true, carBrand: true, carModel: true,
                    status: true, lineUserId: true, lineLinkedAt: true,
                } as any,
            });

            unlinked = await prisma.insuranceClaim.findMany({
                where: { status: { not: "COMPLETED" }, lineUserId: null } as any,
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                    id: true, claimNo: true, customerName: true,
                    plateNo: true, carBrand: true, carModel: true, status: true,
                },
            });
        } catch {
            // lineUserId column ยังไม่มี — ใช้ active claims เป็น unlinked แทน
            try {
                unlinked = await prisma.insuranceClaim.findMany({
                    where: { status: { not: "COMPLETED" } },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    select: {
                        id: true, claimNo: true, customerName: true,
                        plateNo: true, carBrand: true, carModel: true, status: true,
                    },
                });
            } catch { }
        }


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
                    totalClaims,
                    linkedClaims,
                    activeClaims,
                    activeLinked,
                    linkRate: activeClaims > 0 ? Math.round((activeLinked / activeClaims) * 100) : 0,
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
