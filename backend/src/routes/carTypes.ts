import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";

export const carTypesRouter = new Hono();

// GET /api/car-types
carTypesRouter.get("/", async (c) => {
    const carTypes = await prisma.carType.findMany({ orderBy: { order: "asc" } });
    return c.json({ success: true, data: carTypes });
});

// POST /api/car-types
carTypesRouter.post("/", async (c) => {
    const { key, label, brands, order } = await c.req.json();
    if (!key || !label) return c.json({ success: false, error: "key and label required" }, 400);
    const carType = await prisma.carType.create({
        data: { key, label, brands: brands || [], order: order ?? 0 },
    });
    return c.json({ success: true, data: carType });
});

// PUT /api/car-types/:id
carTypesRouter.put("/:id", async (c) => {
    const id = c.req.param("id");
    const { label, brands, order } = await c.req.json();
    const carType = await prisma.carType.update({
        where: { id },
        data: {
            ...(label !== undefined && { label }),
            ...(brands !== undefined && { brands }),
            ...(order !== undefined && { order }),
        },
    });
    return c.json({ success: true, data: carType });
});

// DELETE /api/car-types/:id
carTypesRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");
    await prisma.carType.delete({ where: { id } });
    return c.json({ success: true });
});
