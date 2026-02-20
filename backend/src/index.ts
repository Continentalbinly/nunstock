import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { partsRouter } from "./routes/parts.js";
import { categoriesRouter } from "./routes/categories.js";
import { withdrawalsRouter } from "./routes/withdrawals.js";
import { claimsRouter } from "./routes/claims.js";
import { stockRouter } from "./routes/stock.js";
import { authRouter } from "./routes/auth.js";
import { movementsRouter } from "./routes/movements.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
    "*",
    cors({
        origin: ["http://localhost:9090", "http://0.0.0.0:9090", "http://217.216.73.98:9090"],
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
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});

// Routes
app.route("/api/auth", authRouter);
app.route("/api/parts", partsRouter);
app.route("/api/categories", categoriesRouter);
app.route("/api/withdrawals", withdrawalsRouter);
app.route("/api/claims", claimsRouter);
app.route("/api/stock", stockRouter);
app.route("/api/movements", movementsRouter);

const PORT = Number(process.env.PORT) || 1100;

serve(
    {
        fetch: app.fetch,
        port: PORT,
    },
    (info) => {
        console.log(`\n🚗 NunStock Backend เริ่มทำงานที่ http://localhost:${info.port}`);
        console.log(`📦 API พร้อมใช้งาน\n`);
    }
);

export default app;
