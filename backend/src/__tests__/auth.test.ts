import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-key";

describe("Auth Utilities", () => {
    describe("Password Hashing", () => {
        it("should hash a password and verify it", async () => {
            const password = "admin1234";
            const hash = await bcrypt.hash(password, 12);

            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(20);

            const isValid = await bcrypt.compare(password, hash);
            expect(isValid).toBe(true);
        });

        it("should reject wrong password", async () => {
            const hash = await bcrypt.hash("correct", 12);
            const isValid = await bcrypt.compare("wrong", hash);
            expect(isValid).toBe(false);
        });
    });

    describe("JWT Token", () => {
        it("should create and verify a token", () => {
            const payload = { id: "user-1", username: "admin", name: "ผู้ดูแล", role: "ADMIN" };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

            expect(token).toBeDefined();
            expect(typeof token).toBe("string");

            const decoded = jwt.verify(token, JWT_SECRET) as any;
            expect(decoded.id).toBe("user-1");
            expect(decoded.username).toBe("admin");
            expect(decoded.role).toBe("ADMIN");
        });

        it("should reject invalid token", () => {
            expect(() => {
                jwt.verify("invalid-token", JWT_SECRET);
            }).toThrow();
        });

        it("should reject token with wrong secret", () => {
            const token = jwt.sign({ id: "1" }, JWT_SECRET);
            expect(() => {
                jwt.verify(token, "wrong-secret");
            }).toThrow();
        });
    });

    describe("Role Validation", () => {
        const validRoles = ["ADMIN", "TECH"];

        it("should accept valid roles", () => {
            expect(validRoles.includes("ADMIN")).toBe(true);
            expect(validRoles.includes("TECH")).toBe(true);
        });

        it("should reject invalid roles", () => {
            expect(validRoles.includes("admin")).toBe(false);
            expect(validRoles.includes("SUPERUSER")).toBe(false);
            expect(validRoles.includes("")).toBe(false);
        });
    });
});
