import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "./auth.js";

export const categoriesRouter = new Hono();

categoriesRouter.get("/", async (c) => {
    try {
        const categories = await prisma.partCategory.findMany({
            include: {
                _count: { select: { parts: true } },
                parent: { select: { id: true, name: true } }
            },
            orderBy: [{ parentId: "asc" }, { name: "asc" }],
        });
        return c.json({ success: true, data: categories });
    } catch (error) {
        return c.json({ success: false, error: "ไม่สามารถดึงข้อมูลประเภทอะไหล่ได้" }, 500);
    }
});

const categorySchema = z.object({
    name: z.string().min(1, "กรุณาระบุชื่อประเภท"),
    color: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().optional().nullable(),
});

categoriesRouter.post("/", requireAuth(), requireRole("ADMIN"), zValidator("json", categorySchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const category = await prisma.partCategory.create({ data: body });
        return c.json({ success: true, data: category }, 201);
    } catch (error: any) {
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "ชื่อประเภทนี้มีอยู่แล้ว" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถเพิ่มประเภทได้" }, 500);
    }
});

const updateCategorySchema = z.object({
    name: z.string().min(1, "กรุณาระบุชื่อประเภท"),
});

categoriesRouter.put("/:id", zValidator("json", updateCategorySchema), async (c) => {
    try {
        const id = c.req.param("id");
        const body = c.req.valid("json");
        const category = await prisma.partCategory.update({ where: { id }, data: { name: body.name } });
        return c.json({ success: true, data: category });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "ชื่อนี้มีอยู่แล้ว" }, 400);
        }
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบประเภทที่ต้องการแก้ไข" }, 404);
        }
        return c.json({ success: false, error: "ไม่สามารถแก้ไขประเภทได้" }, 500);
    }
});

// ─── Move category to a new parent ─────────────────────
categoriesRouter.patch("/:id/move", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const id = c.req.param("id");
        const { newParentId } = await c.req.json();
        if (!newParentId) {
            return c.json({ success: false, error: "newParentId is required" }, 400);
        }
        // Prevent moving to self or own descendants
        const allIds: string[] = [id];
        const collectChildren = async (parentId: string) => {
            const children = await prisma.partCategory.findMany({ where: { parentId }, select: { id: true } });
            for (const child of children) {
                allIds.push(child.id);
                await collectChildren(child.id);
            }
        };
        await collectChildren(id);
        if (allIds.includes(newParentId)) {
            return c.json({ success: false, error: "Cannot move category into itself or its own children" }, 400);
        }
        const category = await prisma.partCategory.update({
            where: { id },
            data: { parentId: newParentId },
        });
        return c.json({ success: true, data: category });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบ category ที่ต้องการย้าย" }, 404);
        }
        if (error?.code === "P2002") {
            return c.json({ success: false, error: "ชื่อนี้มีอยู่แล้วใน parent ปลายทาง" }, 400);
        }
        return c.json({ success: false, error: "ไม่สามารถย้าย category ได้" }, 500);
    }
});

// ─── One-time migration: move legacy insurance brands ───
categoriesRouter.post("/migrate-insurance", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const results: string[] = [];

        // ─── 1. วิริยะประกันภัย: move 7 Japanese brands → ญี่ปุ่น ───
        const viriyahId = "cmmbj4keh0001kr4cgo25cij1";
        const japaneseTypeId = "cmmecdp290001kruhgrp7cms8";
        const japaneseBrandIds = [
            "cmmbj85tr0006kr4cbkb91unh", // Honda
            "cmmbj9nx7000ckr4cs9051mkk", // Isuzu
            "cmmdcho4r003tkr1lmvu42s49", // Mazda
            "cmmdcir25003xkr1l1hbgyxek", // Mitsubishi
            "cmmbj8fc10008kr4cin9uux6q", // Nissan
            "cmmbja117000ekr4clewqbng6", // Suzuki
            "cmmbj81x20004kr4cqus8llga", // Toyota
        ];

        for (const brandId of japaneseBrandIds) {
            const brand = await prisma.partCategory.findUnique({ where: { id: brandId } });
            if (brand && brand.parentId === viriyahId) {
                await prisma.partCategory.update({
                    where: { id: brandId },
                    data: { parentId: japaneseTypeId },
                });
                results.push(`Moved ${brand.name} → ญี่ปุ่น (วิริยะ)`);
            } else if (brand && brand.parentId === japaneseTypeId) {
                results.push(`${brand.name} already under ญี่ปุ่น — skipped`);
            }
        }

        // ─── 2. คุ้มภัยโตเกียวมารีน: create ญี่ปุ่น, move brands ───
        const kumphaiId = "cmmbje5mm000gkr4cr19pk5mt";
        const kumphaiChildren = await prisma.partCategory.findMany({ where: { parentId: kumphaiId } });

        // Check if ญี่ปุ่น already exists under คุ้มภัย
        let kumphaiJapanese = kumphaiChildren.find(c => c.name === "ญี่ปุ่น");
        if (!kumphaiJapanese) {
            kumphaiJapanese = await prisma.partCategory.create({
                data: { name: "ญี่ปุ่น", parentId: kumphaiId },
            });
            results.push(`Created ญี่ปุ่น under คุ้มภัยโตเกียวมารีน`);
        }

        const kumphaiIsuzu = "cmmbklikj000ikr20z19ftidl";
        const kumphaiToyota = "cmmbkm3wy000kkr20aqpfszwu";
        for (const brandId of [kumphaiIsuzu, kumphaiToyota]) {
            const brand = await prisma.partCategory.findUnique({ where: { id: brandId } });
            if (brand && brand.parentId === kumphaiId) {
                await prisma.partCategory.update({
                    where: { id: brandId },
                    data: { parentId: kumphaiJapanese.id },
                });
                results.push(`Moved ${brand.name} → ญี่ปุ่น (คุ้มภัย)`);
            } else if (brand) {
                results.push(`${brand.name} already moved — skipped`);
            }
        }

        return c.json({ success: true, data: { results } });
    } catch (error: any) {
        console.error("Migration error:", error);
        return c.json({ success: false, error: error.message || "Migration failed" }, 500);
    }
});

categoriesRouter.delete("/:id", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const id = c.req.param("id");
        // Recursively collect all descendant category IDs
        const allIds: string[] = [id];
        const collectChildren = async (parentId: string) => {
            const children = await prisma.partCategory.findMany({ where: { parentId }, select: { id: true } });
            for (const child of children) {
                allIds.push(child.id);
                await collectChildren(child.id);
            }
        };
        await collectChildren(id);
        // Delete all parts in those categories, then delete categories bottom-up
        await prisma.part.deleteMany({ where: { categoryId: { in: allIds } } });
        // Delete from deepest to shallowest to avoid FK constraint
        for (let i = allIds.length - 1; i >= 0; i--) {
            await prisma.partCategory.delete({ where: { id: allIds[i] } });
        }
        return c.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return c.json({ success: false, error: "ไม่พบประเภทที่ต้องการลบ" }, 404);
        }
        return c.json({ success: false, error: "ไม่สามารถลบประเภทได้" }, 500);
    }
});
