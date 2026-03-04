import { readFileSync } from "fs";
import { resolve } from "path";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// โหลด .env ด้วย fs — ทำงานได้ทุกวิธี (PM2, tsx, node)
(function loadEnv() {
    try {
        const envPath = resolve(process.cwd(), ".env");
        const content = readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx === -1) continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (key && !(key in process.env)) {
                process.env[key] = val;
            }
        }
    } catch { }
})();



import { partsRouter } from "./routes/parts.js";
import { categoriesRouter } from "./routes/categories.js";

import { stockRouter } from "./routes/stock.js";
import { authRouter } from "./routes/auth.js";
import { movementsRouter } from "./routes/movements.js";
import { webhookRouter } from "./routes/webhook.js";
import { lineRouter } from "./routes/line.js";
import { shopStockRouter } from "./routes/shop-stock.js";
import { jobsRouter } from "./routes/jobs.js";
import { notificationsRouter } from "./routes/notifications.js";
import { carTypesRouter } from "./routes/carTypes.js";

import lookupOptionsRouter from "./routes/lookup-options.js";


// ตรวจสอบ JWT_SECRET ตอน startup
if (!process.env.JWT_SECRET) {
    console.warn("⚠️  WARNING: JWT_SECRET ไม่ได้ตั้งค่าใน env — ระบบใช้ fallback key (ไม่ปลอดภัยสำหรับ production!)");
}

// อ่าน CORS origins จาก env
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:9090", "http://0.0.0.0:9090"];

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
    "*",
    cors({
        origin: corsOrigins,
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

// Health check
app.get("/", (c) => {
    return c.json({
        status: "ok",
        message: "NunStock API กำลังทำงาน 🚗",
        version: "1.1.0",
        timestamp: new Date().toISOString(),
    });
});

// Routes
app.route("/api/auth", authRouter);
app.route("/api/parts", partsRouter);
app.route("/api/categories", categoriesRouter);

app.route("/api/stock", stockRouter);
app.route("/api/movements", movementsRouter);
app.route("/api/line", lineRouter);
app.route("/api/shop-stock", shopStockRouter);
app.route("/api/jobs", jobsRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/car-types", carTypesRouter);

app.route("/api/lookup-options", lookupOptionsRouter);
// LINE Webhook — ต้องอยู่นอก /api เพราะ LINE ไม่ส่ง auth cookie
app.route("/webhook", webhookRouter);

const PORT = Number(process.env.PORT) || 1100;

serve(
    {
        fetch: app.fetch,
        port: PORT,
    },
    (info) => {
        console.log(`\n🚗 NunStock Backend เริ่มทำงานที่ http://localhost:${info.port}`);
        console.log(`📦 API พร้อมใช้งาน`);
        console.log(`🌐 CORS origins: ${corsOrigins.join(", ")}\n`);
    }
);

export default app;
