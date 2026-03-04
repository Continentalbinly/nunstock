import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const prisma = new PrismaClient();
const app = new Hono();

// GET — list options by group
app.get("/", async (c) => {
    const group = c.req.query("group"); // "UNIT" | "SPEC"
    const where = group ? { group } : {};
    const options = await prisma.lookupOption.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    });
    return c.json(options);
});

// POST — create new option
const createSchema = z.object({
    group: z.string().min(1),
    value: z.string().min(1),
});

app.post("/", zValidator("json", createSchema), async (c) => {
    const { group, value } = c.req.valid("json");

    // Upsert — if already exists, just return it
    const existing = await prisma.lookupOption.findUnique({
        where: { group_value: { group, value } },
    });
    if (existing) return c.json(existing);

    // Find max sortOrder for this group
    const maxSort = await prisma.lookupOption.aggregate({
        where: { group },
        _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder || 0) + 1;

    const option = await prisma.lookupOption.create({
        data: { group, value, sortOrder: nextSort },
    });
    return c.json(option, 201);
});

export default app;
