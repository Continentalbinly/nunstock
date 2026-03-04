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

        // Find paint & consumable category IDs
        const paintCat = await prisma.partCategory.findFirst({ where: { name: "สีพ่นรถยนต์", parentId: null } });
        const consumableCat = await prisma.partCategory.findFirst({ where: { name: "วัสดุสิ้นเปลือง", parentId: null } });

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
            paintCount,
            consumableCount,
            shopStockAgg,
        ] = await Promise.all([
            prisma.part.count(),
            prisma.partCategory.count(),
            prisma.part.findMany({
                where: {
                    quantity: { lte: 5 },
                    minStock: { gt: 0 },
                    NOT: { code: { startsWith: "INS-" } },
                },
                include: { category: true },
                orderBy: { quantity: "asc" },
                take: 10,
            }),
            prisma.job.findMany({
                where: { type: "INSURANCE", status: { in: ["WAITING_PARTS", "RECEIVED", "IN_PROGRESS"] } },
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
            // Paint parts count (in สีพ่นรถยนต์ category)
            paintCat ? prisma.part.count({ where: { categoryId: paintCat.id } }) : Promise.resolve(0),
            // Consumable parts count (in วัสดุสิ้นเปลือง category)
            consumableCat ? prisma.part.count({ where: { categoryId: consumableCat.id } }) : Promise.resolve(0),
            // Shop stock total quantity
            prisma.shopStock.aggregate({ _sum: { quantity: true } }),
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
                paintCount,
                consumableCount,
                shopStockCount: shopStockAgg._sum.quantity || 0,
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

// GET /api/stock/daily-summary — สรุปรายวัน (รถจอด, รถออก, โทรแจ้งเคลม, ปิดงาน, หมายเหตุ)
stockRouter.get("/daily-summary", async (c) => {
    try {
        const { date } = c.req.query();
        // Parse date as local time (avoid UTC shift from new Date("YYYY-MM-DD"))
        let dayStart: Date, dayEnd: Date;
        if (date) {
            const [y, m, d] = date.split("-").map(Number);
            dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
            dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
        } else {
            const now = new Date();
            dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }

        // 1. รถจอด (รับรถ) = status changed TO "RECEIVED" today
        const receivedLogs = await prisma.jobStatusLog.findMany({
            where: { toStatus: "RECEIVED", changedAt: { gte: dayStart, lte: dayEnd } },
            include: { job: { select: { id: true, jobNo: true, carBrand: true, carModel: true, plateNo: true, customerName: true, insuranceComp: true, type: true } } },
            orderBy: { changedAt: "asc" },
        });

        // 2. รถออก (ส่งมอบ) = status changed TO "DELIVERED" today
        const deliveredLogs = await prisma.jobStatusLog.findMany({
            where: { toStatus: "DELIVERED", changedAt: { gte: dayStart, lte: dayEnd } },
            include: { job: { select: { id: true, jobNo: true, carBrand: true, carModel: true, plateNo: true, customerName: true, insuranceComp: true, type: true } } },
            orderBy: { changedAt: "asc" },
        });

        // 3. รถแจ้งเคลม = logs with notes "แจ้งเคลม" today
        const claimCallLogs = await prisma.jobStatusLog.findMany({
            where: { notes: "แจ้งเคลม", changedAt: { gte: dayStart, lte: dayEnd } },
            include: { job: { select: { id: true, jobNo: true, carBrand: true, carModel: true, plateNo: true, customerName: true, insuranceComp: true, type: true } } },
            orderBy: { changedAt: "asc" },
        });

        // 4. ปิดงาน = status changed TO "CLOSED" today
        const closedLogs = await prisma.jobStatusLog.findMany({
            where: { toStatus: "CLOSED", changedAt: { gte: dayStart, lte: dayEnd } },
            include: { job: { select: { id: true, jobNo: true, carBrand: true, carModel: true, plateNo: true, customerName: true, insuranceComp: true, type: true } } },
            orderBy: { changedAt: "asc" },
        });

        // 5. หมายเหตุ = JobNote created today
        const dailyNotes = await prisma.jobNote.findMany({
            where: { createdAt: { gte: dayStart, lte: dayEnd } },
            include: { job: { select: { id: true, jobNo: true, carBrand: true, carModel: true, plateNo: true, customerName: true } } },
            orderBy: { createdAt: "asc" },
        });

        const mapLog = (l: any) => ({
            jobId: l.job.id, jobNo: l.job.jobNo, carBrand: l.job.carBrand, carModel: l.job.carModel,
            plateNo: l.job.plateNo, customerName: l.job.customerName,
            insuranceComp: l.job.type === "CASH" ? "หน้าร้าน" : (l.job.insuranceComp || "ไม่ระบุ"),
            time: l.changedAt,
        });

        return c.json({
            success: true,
            data: {
                date: date || `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`,
                received: receivedLogs.map(mapLog),
                delivered: deliveredLogs.map(mapLog),
                claimCalled: claimCallLogs.map(mapLog),
                closed: closedLogs.map(mapLog),
                notes: dailyNotes.map((n: any) => ({
                    jobId: n.job.id, jobNo: n.job.jobNo, carBrand: n.job.carBrand, carModel: n.job.carModel,
                    plateNo: n.job.plateNo, customerName: n.job.customerName, note: n.note, time: n.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error("Daily summary error:", error);
        return c.json({ success: false, error: "ไม่สามารถดึงสรุปรายวันได้" }, 500);
    }
});

// GET /api/stock/weekly-summary — สรุปรายสัปดาห์ (ตาราง 7 วัน แยกตามบริษัทประกัน)
stockRouter.get("/weekly-summary", async (c) => {
    try {
        const { date } = c.req.query();
        // Find Monday of the week containing the given date
        const target = date ? new Date(date + "T00:00:00") : new Date();
        const day = target.getDay(); // 0=Sun, 1=Mon, ...
        const monday = new Date(target);
        monday.setDate(target.getDate() - ((day === 0 ? 7 : day) - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        // Fetch all RECEIVED and DELIVERED logs for the whole week
        const [receivedLogs, deliveredLogs] = await Promise.all([
            prisma.jobStatusLog.findMany({
                where: { toStatus: "RECEIVED", changedAt: { gte: monday, lte: sunday } },
                include: { job: { select: { type: true, insuranceComp: true } } },
                orderBy: { changedAt: "asc" },
            }),
            prisma.jobStatusLog.findMany({
                where: { toStatus: "DELIVERED", changedAt: { gte: monday, lte: sunday } },
                include: { job: { select: { type: true, insuranceComp: true } } },
                orderBy: { changedAt: "asc" },
            }),
        ]);

        const getCompany = (log: any) => log.job.type === "CASH" ? "หน้าร้าน" : (log.job.insuranceComp || "ไม่ระบุ");
        const companiesSet = new Set<string>();

        // Build daily breakdown
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

            const dayReceived = receivedLogs.filter(l => l.changedAt >= dayStart && l.changedAt <= dayEnd);
            const dayDelivered = deliveredLogs.filter(l => l.changedAt >= dayStart && l.changedAt <= dayEnd);

            const recByCompany: Record<string, number> = {};
            dayReceived.forEach(l => { const co = getCompany(l); recByCompany[co] = (recByCompany[co] || 0) + 1; companiesSet.add(co); });

            const delByCompany: Record<string, number> = {};
            dayDelivered.forEach(l => { const co = getCompany(l); delByCompany[co] = (delByCompany[co] || 0) + 1; companiesSet.add(co); });

            days.push({
                date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                dayName: d.toLocaleDateString("th-TH", { weekday: "short" }),
                received: { total: dayReceived.length, byCompany: recByCompany },
                delivered: { total: dayDelivered.length, byCompany: delByCompany },
            });
        }

        // Totals
        const totalRecByCompany: Record<string, number> = {};
        const totalDelByCompany: Record<string, number> = {};
        receivedLogs.forEach(l => { const co = getCompany(l); totalRecByCompany[co] = (totalRecByCompany[co] || 0) + 1; });
        deliveredLogs.forEach(l => { const co = getCompany(l); totalDelByCompany[co] = (totalDelByCompany[co] || 0) + 1; });

        return c.json({
            success: true,
            data: {
                weekStart: `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`,
                weekEnd: `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`,
                days,
                totals: {
                    received: { total: receivedLogs.length, byCompany: totalRecByCompany },
                    delivered: { total: deliveredLogs.length, byCompany: totalDelByCompany },
                },
                companies: Array.from(companiesSet).sort(),
            },
        });
    } catch (error) {
        console.error("Weekly summary error:", error);
        return c.json({ success: false, error: "ไม่สามารถดึงสรุปรายสัปดาห์ได้" }, 500);
    }
});

// GET /api/stock/monthly-summary — สรุปรายเดือน (รถเข้า/รถออก/มาก่อน แยกตามบริษัท)
stockRouter.get("/monthly-summary", async (c) => {
    try {
        const { month } = c.req.query(); // YYYY-MM
        let monthStart: Date, monthEnd: Date;
        if (month) {
            const [y, m] = month.split("-").map(Number);
            monthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
            monthEnd = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
        } else {
            const now = new Date();
            monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        const getCompany = (job: any) => job.type === "CASH" ? "หน้าร้าน" : (job.insuranceComp || "ไม่ระบุ");

        // 1. รถเข้าซ่อม = RECEIVED this month
        const receivedLogs = await prisma.jobStatusLog.findMany({
            where: { toStatus: "RECEIVED", changedAt: { gte: monthStart, lte: monthEnd } },
            include: { job: { select: { type: true, insuranceComp: true } } },
        });

        // 2. รถออก = DELIVERED this month
        const deliveredLogs = await prisma.jobStatusLog.findMany({
            where: { toStatus: "DELIVERED", changedAt: { gte: monthStart, lte: monthEnd } },
            include: { job: { select: { type: true, insuranceComp: true } } },
        });

        // 3. รถมาเคลม = logs with notes "แจ้งเคลม" this month
        const claimCalledLogs = await prisma.jobStatusLog.findMany({
            where: { notes: "แจ้งเคลม", changedAt: { gte: monthStart, lte: monthEnd } },
            include: { job: { select: { type: true, insuranceComp: true } } },
        });

        const groupByCompany = (items: any[], fromJob = false) => {
            const byCompany: Record<string, number> = {};
            const companiesLocal = new Set<string>();
            items.forEach(item => {
                const job = fromJob ? item : item.job;
                const co = getCompany(job);
                byCompany[co] = (byCompany[co] || 0) + 1;
                companiesLocal.add(co);
            });
            return { total: items.length, byCompany, companies: companiesLocal };
        };

        const recGroup = groupByCompany(receivedLogs);
        const delGroup = groupByCompany(deliveredLogs);
        const claimGroup = groupByCompany(claimCalledLogs);

        const allCompanies = new Set<string>();
        [recGroup, delGroup, claimGroup].forEach(g => g.companies.forEach(co => allCompanies.add(co)));

        const monthLabel = monthStart.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

        return c.json({
            success: true,
            data: {
                month: month || `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
                monthLabel,
                received: { total: recGroup.total, byCompany: recGroup.byCompany },
                delivered: { total: delGroup.total, byCompany: delGroup.byCompany },
                claimCalled: { total: claimGroup.total, byCompany: claimGroup.byCompany },
                companies: Array.from(allCompanies).sort(),
            },
        });
    } catch (error) {
        console.error("Monthly summary error:", error);
        return c.json({ success: false, error: "ไม่สามารถดึงสรุปรายเดือนได้" }, 500);
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
