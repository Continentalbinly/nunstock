import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";

export const paintColorsRouter = new Hono();

// === Paint Brands ===

// GET /api/paint-brands
paintColorsRouter.get("/brands", async (c) => {
    const brands = await prisma.paintBrand.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { colors: true } } },
    });
    return c.json({ success: true, data: brands });
});

// POST /api/paint-brands
paintColorsRouter.post("/brands", async (c) => {
    const { name, order } = await c.req.json();
    if (!name) return c.json({ success: false, error: "name required" }, 400);
    const brand = await prisma.paintBrand.create({ data: { name, order: order ?? 0 } });
    return c.json({ success: true, data: brand });
});

// PUT /api/paint-brands/:id
paintColorsRouter.put("/brands/:id", async (c) => {
    const id = c.req.param("id");
    const { name, order } = await c.req.json();
    const brand = await prisma.paintBrand.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(order !== undefined && { order }),
        },
    });
    return c.json({ success: true, data: brand });
});

// DELETE /api/paint-brands/:id
paintColorsRouter.delete("/brands/:id", async (c) => {
    const id = c.req.param("id");
    await prisma.paintBrand.delete({ where: { id } });
    return c.json({ success: true });
});

// === Paint Colors ===

// GET /api/paint-brands/:id/colors
paintColorsRouter.get("/brands/:id/colors", async (c) => {
    const brandId = c.req.param("id");
    const type = c.req.query("type");
    const where: any = { brandId };
    if (type && type !== "ทั้งหมด") where.type = type;
    const colors = await prisma.paintColor.findMany({
        where,
        orderBy: { code: "asc" },
    });
    return c.json({ success: true, data: colors });
});

// POST /api/paint-brands/:id/colors
paintColorsRouter.post("/brands/:id/colors", async (c) => {
    const brandId = c.req.param("id");
    const { code, name, type, quantity, unit } = await c.req.json();
    if (!code || !name) return c.json({ success: false, error: "code and name required" }, 400);
    const color = await prisma.paintColor.create({
        data: { brandId, code, name, type: type || "แม่สี", quantity: quantity ?? 0, unit: unit || "กระป๋อง" },
    });
    return c.json({ success: true, data: color });
});

// PUT /api/paint-colors/:id
paintColorsRouter.put("/colors/:id", async (c) => {
    const id = c.req.param("id");
    const { code, name, type, quantity, unit } = await c.req.json();
    const color = await prisma.paintColor.update({
        where: { id },
        data: {
            ...(code !== undefined && { code }),
            ...(name !== undefined && { name }),
            ...(type !== undefined && { type }),
            ...(quantity !== undefined && { quantity }),
            ...(unit !== undefined && { unit }),
        },
    });
    return c.json({ success: true, data: color });
});

// DELETE /api/paint-colors/:id
paintColorsRouter.delete("/colors/:id", async (c) => {
    const id = c.req.param("id");
    await prisma.paintColor.delete({ where: { id } });
    return c.json({ success: true });
});
