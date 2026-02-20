import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";

export const stockRouter = new Hono();

// GET /api/stock/summary - สรุปสต็อกสำหรับ Dashboard
stockRouter.get("/summary", async (c) => {
    try {
        const [totalParts, totalCategories, lowStockParts, recentWithdrawals, recentClaims, recentMovements] =
            await Promise.all([
                prisma.part.count(),
                prisma.partCategory.count(),
                prisma.part.findMany({
                    where: { quantity: { lte: 5 } }, // low stock
                    include: { category: true },
                    orderBy: { quantity: "asc" },
                    take: 10,
                }),
                prisma.withdrawal.findMany({
                    include: { part: { include: { category: true } } },
                    orderBy: { createdAt: "desc" },
                    take: 5,
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
            ]);

        // Count by category
        const byCategory = await prisma.partCategory.findMany({
            include: {
                _count: { select: { parts: true } },
                parts: { select: { quantity: true } },
            },
        });

        const categorySummary = byCategory.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            icon: c.icon,
            partCount: c._count.parts,
            totalStock: c.parts.reduce((sum, p) => sum + p.quantity, 0),
        }));

        const actualLowStock = lowStockParts.filter((p) => p.quantity <= p.minStock);

        return c.json({
            success: true,
            data: {
                totalParts,
                totalCategories,
                lowStockCount: actualLowStock.length,
                pendingClaimsCount: recentClaims.length,
                lowStockParts: actualLowStock,
                recentWithdrawals,
                pendingClaims: recentClaims,
                recentMovements,
                categorySummary,
            },
        });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลสรุปได้" }, 500);
    }
});
