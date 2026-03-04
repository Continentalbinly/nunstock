import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

export const authRouter = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || "nunstock-secret-key-2025";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
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
            secure: IS_PRODUCTION,
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

// Middleware สำหรับ check role
export function requireRole(...roles: string[]) {
    return async (c: any, next: any) => {
        const user = c.get("user");
        if (!user || !roles.includes(user.role)) {
            return c.json({ success: false, error: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้" }, 403);
        }
        await next();
    };
}

// ─── User Management (admin only) ─────────

// GET /api/auth/users - list all users
authRouter.get("/users", requireAuth(), requireRole("ADMIN"), async (c) => {
    const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
    });
    return c.json({ success: true, data: users });
});

// POST /api/auth/users - create new user
authRouter.post("/users", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const { username, password, name, role } = await c.req.json();
        if (!username || !password || !name) {
            return c.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบ" }, 400);
        }
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return c.json({ success: false, error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" }, 400);
        }
        const user = await prisma.user.create({
            data: {
                username,
                password: await bcrypt.hash(password, 12),
                name,
                role: role === "TECH" ? "TECH" : "ADMIN",
            },
            select: { id: true, username: true, name: true, role: true, createdAt: true },
        });
        return c.json({ success: true, data: user }, 201);
    } catch {
        return c.json({ success: false, error: "ไม่สามารถสร้างผู้ใช้ได้" }, 500);
    }
});

// PATCH /api/auth/users/:id - update user
authRouter.patch("/users/:id", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const { id } = c.req.param();
        const body = await c.req.json();
        const data: any = {};
        if (body.name) data.name = body.name;
        if (body.role && ["ADMIN", "TECH"].includes(body.role)) data.role = body.role;
        if (body.password) data.password = await bcrypt.hash(body.password, 12);
        const user = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, username: true, name: true, role: true, createdAt: true },
        });
        return c.json({ success: true, data: user });
    } catch {
        return c.json({ success: false, error: "ไม่สามารถแก้ไขผู้ใช้ได้" }, 500);
    }
});

// DELETE /api/auth/users/:id - delete user
authRouter.delete("/users/:id", requireAuth(), requireRole("ADMIN"), async (c) => {
    try {
        const { id } = c.req.param();
        const me = (c as any).get("user");
        if (me.id === id) {
            return c.json({ success: false, error: "ไม่สามารถลบตัวเองได้" }, 400);
        }
        await prisma.user.delete({ where: { id } });
        return c.json({ success: true, message: "ลบผู้ใช้แล้ว" });
    } catch {
        return c.json({ success: false, error: "ไม่สามารถลบผู้ใช้ได้" }, 500);
    }
});
