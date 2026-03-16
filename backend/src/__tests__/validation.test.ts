import { describe, it, expect } from "vitest";
import { z } from "zod";

// Recreate the schemas exactly as they are in the routes (no DB needed)
const PART_CODE_REGEX = /^[A-Za-z0-9\-_.*@#!+/\\]+$/;
const PART_CODE_ERROR = "รหัสต้องเป็นภาษาอังกฤษ ตัวเลข หรืออักขระพิเศษเท่านั้น (A-Z, 0-9, -_.*@#!+/)";

const partSchema = z.object({
    code: z.string().min(1, "กรุณาระบุรหัสอะไหล่").regex(PART_CODE_REGEX, PART_CODE_ERROR),
    name: z.string().min(1, "กรุณาระบุชื่ออะไหล่"),
    type: z.enum(["CONSUMABLE", "INSURANCE", "PAINT"]).optional(),
    description: z.string().optional(),
    brand: z.string().optional(),
    specification: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    categoryId: z.string().optional(),
});

const movementSchema = z.object({
    partId: z.string().min(1, "กรุณาเลือกอะไหล่"),
    type: z.enum(["IN", "OUT"]),
    quantity: z.number().int().min(1, "จำนวนต้องมากกว่า 0"),
    reason: z.string().optional(),
    jobNo: z.string().optional(),
    techName: z.string().optional(),
});

describe("Part Schema Validation", () => {
    it("should accept valid part data", () => {
        const data = { code: "PAINT-001", name: "สีแดง", type: "PAINT" as const, unit: "กระป๋อง", quantity: 10 };
        const result = partSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("should accept part without optional fields", () => {
        const data = { code: "P-001", name: "สีดำ" };
        const result = partSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("should reject part without code", () => {
        const data = { name: "สีแดง" };
        const result = partSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should reject part without name", () => {
        const data = { code: "P-001" };
        const result = partSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should reject empty code", () => {
        const data = { code: "", name: "สีแดง" };
        const result = partSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should reject invalid type", () => {
        const data = { code: "P-001", name: "สีแดง", type: "INVALID" };
        const result = partSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should reject negative quantity", () => {
        const data = { code: "P-001", name: "สีแดง", quantity: -1 };
        const result = partSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should accept all valid part types", () => {
        for (const type of ["CONSUMABLE", "INSURANCE", "PAINT"] as const) {
            const result = partSchema.safeParse({ code: "P-001", name: "Test", type });
            expect(result.success).toBe(true);
        }
    });

    // ── Part Code Format Tests ──────────────────────────
    it("should accept English code with dashes (IN-TYT-003)", () => {
        const result = partSchema.safeParse({ code: "IN-TYT-003", name: "Test" });
        expect(result.success).toBe(true);
    });

    it("should accept code with special characters (PT#013)", () => {
        const result = partSchema.safeParse({ code: "PT#013", name: "Test" });
        expect(result.success).toBe(true);
    });

    it("should accept auto-generated insurance code (INS-M5ABCDE)", () => {
        const result = partSchema.safeParse({ code: "INS-M5ABCDE", name: "Test" });
        expect(result.success).toBe(true);
    });

    it("should accept code with allowed special chars (-_.*@#!+/)", () => {
        const result = partSchema.safeParse({ code: "A-B_C.D*E@F#G!H+I/J", name: "Test" });
        expect(result.success).toBe(true);
    });

    it("should reject Thai-only code (มือเปิดประตู)", () => {
        const result = partSchema.safeParse({ code: "มือเปิดประตู", name: "Test" });
        expect(result.success).toBe(false);
    });

    it("should reject mixed Thai+English code (บานพับ-001)", () => {
        const result = partSchema.safeParse({ code: "บานพับ-001", name: "Test" });
        expect(result.success).toBe(false);
    });

    it("should reject code with spaces (part 001)", () => {
        const result = partSchema.safeParse({ code: "part 001", name: "Test" });
        expect(result.success).toBe(false);
    });
});

describe("Movement Schema Validation", () => {
    it("should accept valid OUT movement", () => {
        const data = { partId: "abc123", type: "OUT" as const, quantity: 5, reason: "ใช้งาน JOB-003" };
        const result = movementSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("should accept valid IN movement", () => {
        const data = { partId: "abc123", type: "IN" as const, quantity: 10 };
        const result = movementSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("should accept movement with jobNo and techName", () => {
        const data = { partId: "abc", type: "OUT" as const, quantity: 1, jobNo: "JOB-0003", techName: "ช่างสมชาย" };
        const result = movementSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("should reject movement without partId", () => {
        const data = { type: "OUT", quantity: 1 };
        const result = movementSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should reject movement with zero quantity", () => {
        const data = { partId: "abc", type: "OUT", quantity: 0 };
        const result = movementSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should reject invalid movement type", () => {
        const data = { partId: "abc", type: "TRANSFER", quantity: 1 };
        const result = movementSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("should reject negative quantity", () => {
        const data = { partId: "abc", type: "IN", quantity: -5 };
        const result = movementSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});
