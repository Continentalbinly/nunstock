import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

export const authRouter = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || "nunstock-secret-key-2025";
const COOKIE_NAME = "nunstock_token";

// POST /api/auth/login
authRouter.post("/login", async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password) {
            return c.json({ success: false, error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" }, 400);
        }
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return c.json({ success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return c.json({ success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
        setCookie(c, COOKIE_NAME, token, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });
        return c.json({ success: true, data: { id: user.id, username: user.username, name: user.name, role: user.role } });
    } catch {
        return c.json({ success: false, error: "เกิดข้อผิดพลาด" }, 500);
    }
});

// POST /api/auth/logout
authRouter.post("/logout", (c) => {
    deleteCookie(c, COOKIE_NAME, { path: "/" });
    return c.json({ success: true, message: "ออกจากระบบแล้ว" });
});

// GET /api/auth/me
authRouter.get("/me", (c) => {
    try {
        const token = getCookie(c, COOKIE_NAME);
        if (!token) return c.json({ success: false, error: "ไม่ได้เข้าสู่ระบบ" }, 401);
        const payload = jwt.verify(token, JWT_SECRET) as any;
        return c.json({ success: true, data: { id: payload.id, username: payload.username, name: payload.name, role: payload.role } });
    } catch {
        return c.json({ success: false, error: "Token ไม่ถูกต้อง" }, 401);
    }
});

// Middleware สำหรับ verify token
export function requireAuth() {
    return async (c: any, next: any) => {
        const token = getCookie(c, COOKIE_NAME);
        if (!token) return c.json({ success: false, error: "กรุณาเข้าสู่ระบบก่อน" }, 401);
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            c.set("user", payload);
            await next();
        } catch {
            return c.json({ success: false, error: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401);
        }
    };
}
