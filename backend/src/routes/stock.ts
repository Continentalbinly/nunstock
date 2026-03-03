import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";

export const stockRouter = new Hono();

// GET /api/stock/summary - สรุปสต็อกสำหรับ Dashboard
stockRouter.get("/summary", async (c) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const [
            totalParts,
            totalCategories,
            lowStockParts,
            recentClaims,
            recentMovements,
            totalStockAgg,
            todayOutCount,
            todayInCount,
            topWithdrawnRaw,
        ] = await Promise.all([
            prisma.part.count(),
            prisma.partCategory.count(),
            prisma.part.findMany({
                where: { quantity: { lte: 5 } },
                include: { category: true },
                orderBy: { quantity: "asc" },
                take: 10,
            }),
            prisma.insuranceClaim.findMany({
                where: { status: { in: ["PENDING", "ORDERED", "ARRIVED"] } },
                include: { items: true },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            prisma.stockMovement.findMany({
                include: {
                    part: { include: { category: true } },
                    user: { select: { id: true, username: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
            // Sum of all part quantities
            prisma.part.aggregate({ _sum: { quantity: true } }),
            // Today OUT count
            prisma.stockMovement.count({ where: { type: "OUT", createdAt: { gte: todayStart } } }),
            // Today IN count
            prisma.stockMovement.count({ where: { type: "IN", createdAt: { gte: todayStart } } }),
            // Top withdrawn parts this month
            prisma.stockMovement.groupBy({
                by: ["partId"],
                where: { type: "OUT", createdAt: { gte: thisMonthStart } },
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: "desc" } },
                take: 5,
            }),
        ]);

        // Enrich top withdrawn with part info
        const topPartIds = topWithdrawnRaw.map(t => t.partId);
        const topParts = await prisma.part.findMany({
            where: { id: { in: topPartIds } },
            include: { category: true },
        });
        const topPartMap = new Map(topParts.map(p => [p.id, p]));
        const topWithdrawn = topWithdrawnRaw.map(t => ({
            partId: t.partId,
            totalQty: t._sum.quantity || 0,
            part: topPartMap.get(t.partId),
        }));

        const actualLowStock = lowStockParts.filter((p) => p.quantity <= p.minStock);

        // Compute daily movements for 7 days chart
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentDailyMovements = await prisma.stockMovement.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { type: true, quantity: true, createdAt: true },
        });

        const dailyMap = new Map<string, { inQty: number; outQty: number }>();
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const key = d.toISOString().split("T")[0];
            dailyMap.set(key, { inQty: 0, outQty: 0 });
        }
        for (const m of recentDailyMovements) {
            const key = m.createdAt.toISOString().split("T")[0];
            const entry = dailyMap.get(key);
            if (entry) {
                if (m.type === "IN") entry.inQty += m.quantity;
                else entry.outQty += m.quantity;
            }
        }
        const dailyChart = Array.from(dailyMap.entries()).map(([date, data]) => ({
            date,
            label: new Date(date).toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
            ...data,
        }));

        return c.json({
            success: true,
            data: {
                totalParts,
                totalCategories,
                totalStock: totalStockAgg._sum.quantity || 0,
                lowStockCount: actualLowStock.length,
                pendingClaimsCount: recentClaims.length,
                todayOutCount,
                todayInCount,
                lowStockParts: actualLowStock,
                pendingClaims: recentClaims,
                recentMovements,
                topWithdrawn,
                dailyChart,
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลสรุปได้" }, 500);
    }
});

// GET /api/stock/low-stock - รายการสินค้าใกล้หมด (เฉพาะ consumable + shop, ไม่รวม insurance catalog)
stockRouter.get("/low-stock", async (c) => {
    try {
        const allParts = await prisma.part.findMany({
            where: {
                minStock: { gt: 0 },  // Skip catalog items (minStock=0)
                NOT: { code: { startsWith: "INS-" } },  // Skip insurance catalog
            },
            include: { category: { include: { parent: true } } },
            orderBy: { quantity: "asc" },
        });
        const lowStock = allParts.filter(p => p.quantity <= p.minStock);
        return c.json({ success: true, data: lowStock });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลได้" }, 500);
    }
});

// GET /api/stock/jobs-report - สรุป Jobs + รายการ Jobs
stockRouter.get("/jobs-report", async (c) => {
    try {
        const { from, to, status, type, search } = c.req.query();
        const where: any = {};

        if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            where.createdAt = { ...where.createdAt, lte: toDate };
        }
        if (status) where.status = status;
        if (type) where.type = type;
        if (search) {
            where.OR = [
                { jobNo: { contains: search, mode: "insensitive" } },
                { customerName: { contains: search, mode: "insensitive" } },
                { plateNo: { contains: search, mode: "insensitive" } },
            ];
        }

        const [jobs, summary] = await Promise.all([
            prisma.job.findMany({
                where,
                include: {
                    parts: { select: { id: true, partName: true, status: true, source: true, quantity: true } },
                    _count: { select: { parts: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            // Summary counts by status
            prisma.job.groupBy({
                by: ["status"],
                _count: true,
            }),
        ]);

        const statusCounts: Record<string, number> = {};
        for (const s of summary) { statusCounts[s.status] = s._count; }

        // Parts used this month
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);
        const partsUsedThisMonth = await prisma.jobPart.count({
            where: { addedAt: { gte: thisMonthStart } },
        });

        return c.json({
            success: true,
            data: {
                jobs,
                statusCounts,
                totalJobs: jobs.length,
                partsUsedThisMonth,
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงรายงาน Jobs ได้" }, 500);
    }
});

// GET /api/stock/report - รายงานสต็อกตามช่วงวันที่
stockRouter.get("/report", async (c) => {
    try {
        const { from, to, type, search } = c.req.query();
        const where: any = {};

        if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            where.createdAt = { ...where.createdAt, lte: toDate };
        }
        if (type && (type === "IN" || type === "OUT")) where.type = type;
        if (search) {
            where.part = {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                ],
            };
        }

        const [movements, summaryIn, summaryOut] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                include: {
                    part: { include: { category: true } },
                    user: { select: { id: true, username: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.stockMovement.aggregate({
                where: { ...where, type: "IN" },
                _sum: { quantity: true },
                _count: true,
            }),
            prisma.stockMovement.aggregate({
                where: { ...where, type: "OUT" },
                _sum: { quantity: true },
                _count: true,
            }),
        ]);

        return c.json({
            success: true,
            data: {
                movements,
                summary: {
                    inTotal: summaryIn._sum.quantity || 0,
                    inCount: summaryIn._count,
                    outTotal: summaryOut._sum.quantity || 0,
                    outCount: summaryOut._count,
                    netChange: (summaryIn._sum.quantity || 0) - (summaryOut._sum.quantity || 0),
                },
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงรายงานได้" }, 500);
    }
});

// GET /api/stock/consumable-history — ประวัติเบิกวัสดุสิ้นเปลือง
stockRouter.get("/consumable-history", async (c) => {
    try {
        const { from, to, search } = c.req.query();
        const where: any = { source: "CONSUMABLE" };

        if (from) where.addedAt = { ...where.addedAt, gte: new Date(from) };
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            where.addedAt = { ...where.addedAt, lte: toDate };
        }
        if (search) {
            where.OR = [
                { partName: { contains: search, mode: "insensitive" } },
                { withdrawnBy: { contains: search, mode: "insensitive" } },
                { job: { jobNo: { contains: search, mode: "insensitive" } } },
            ];
        }

        const [items, totalAgg] = await Promise.all([
            prisma.jobPart.findMany({
                where,
                include: {
                    job: { select: { id: true, jobNo: true, customerName: true, carBrand: true, carModel: true, plateNo: true } },
                },
                orderBy: { addedAt: "desc" },
            }),
            prisma.jobPart.aggregate({
                where,
                _count: true,
                _sum: { quantity: true },
            }),
        ]);

        return c.json({
            success: true,
            data: {
                items,
                summary: {
                    totalItems: totalAgg._count,
                    totalPieces: totalAgg._sum.quantity || 0,
                },
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงประวัติเบิกวัสดุได้" }, 500);
    }
});

// GET /api/stock/paint-history — ประวัติเบิกสี
stockRouter.get("/paint-history", async (c) => {
    try {
        const { from, to, search } = c.req.query();
        const where: any = { source: "PAINT" };

        if (from) where.addedAt = { ...where.addedAt, gte: new Date(from) };
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            where.addedAt = { ...where.addedAt, lte: toDate };
        }
        if (search) {
            where.OR = [
                { partName: { contains: search, mode: "insensitive" } },
                { withdrawnBy: { contains: search, mode: "insensitive" } },
                { job: { jobNo: { contains: search, mode: "insensitive" } } },
            ];
        }

        const [items, totalAgg] = await Promise.all([
            prisma.jobPart.findMany({
                where,
                include: {
                    job: { select: { id: true, jobNo: true, customerName: true, carBrand: true, carModel: true, plateNo: true } },
                },
                orderBy: { addedAt: "desc" },
            }),
            prisma.jobPart.aggregate({
                where,
                _count: true,
                _sum: { quantity: true },
            }),
        ]);

        return c.json({
            success: true,
            data: {
                items,
                summary: {
                    totalItems: totalAgg._count,
                    totalPieces: totalAgg._sum.quantity || 0,
                },
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงประวัติเบิกสีได้" }, 500);
    }
});

// GET /api/stock/audit — ดึง audit logs
stockRouter.get("/audit", requireAuth(), async (c) => {
    try {
        const page = parseInt(c.req.query("page") || "1");
        const limit = parseInt(c.req.query("limit") || "50");
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: { user: { select: { name: true, username: true } } },
            }),
            prisma.auditLog.count(),
        ]);

        return c.json({
            success: true,
            data: { logs, total, page, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึง audit log ได้" }, 500);
    }
});
