import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { sendLinePush } from "../lib/line.js";
import * as crypto from "crypto";

export const webhookRouter = new Hono();

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_SECRET = process.env.LINE_CHANNEL_SECRET;
const IS_DEV = process.env.NODE_ENV !== "production";

/** ตรวจสอบ HMAC-SHA256 signature จาก LINE */
function verifySignature(body: string, signature: string): boolean {
    if (!LINE_SECRET) return false;
    const hash = crypto
        .createHmac("sha256", LINE_SECRET)
        .update(body)
        .digest("base64");
    return hash === signature;
}

/** ส่ง Reply Message ไปหาลูกค้า */
async function sendLineReply(replyToken: string, text: string): Promise<void> {
    if (!LINE_TOKEN || replyToken === "test") return;
    await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LINE_TOKEN}`,
        },
        body: JSON.stringify({
            replyToken,
            messages: [{ type: "text", text }],
        }),
    }).catch(() => { });
}

/** Normalize ทะเบียน: ลบ space, dash, ทำ uppercase */
function normalizePlate(text: string): string {
    return text.replace(/[\s\-\.]/g, "").toUpperCase();
}



/**
 * ตรวจสอบว่ามี LineRegistration ที่ตรงกับ Job นี้ไหม
 * ถ้ามี → ผูก lineUserId เข้ากับ Job + push confirmation
 */
export async function checkAndLinkPendingRegistration(job: {
    id: string; jobNo: string; customerName: string; carBrand: string; carModel: string; plateNo: string;
    insuranceComp?: string | null;
}) {
    const normalized = normalizePlate(job.plateNo);

    // หา registration ที่ยังไม่ matched โดยเทียบจาก normalizedPlate
    const pending = await prisma.lineRegistration.findFirst({
        where: {
            normalizedPlate: normalized,
            matched: false,
        },
        orderBy: { createdAt: "desc" },
    });

    if (!pending) return;

    // ผูก registration กับ Job
    await prisma.$transaction([
        prisma.lineRegistration.update({
            where: { id: pending.id },
            data: { matched: true },
        }),
        prisma.job.update({
            where: { id: job.id },
            data: { lineUserId: pending.lineUserId, lineLinkedAt: new Date() },
        }),
    ]);

    const statusTh: Record<string, string> = {
        WAITING_PARTS: "รออะไหล่ ⏳",
        RECEIVED: "รับรถแล้ว 🚗",
        IN_PROGRESS: "กำลังซ่อม 🔧",
        COMPLETED: "ซ่อมเสร็จ ✅",
        DELIVERED: "ส่งมอบแล้ว 🚚",
    };

    // Push confirmation ไปหาลูกค้า
    const msg = [
        `✅ พบงานซ่อมตรงกับข้อมูลของคุณ!`,
        ``,
        `📋 Job: ${job.jobNo}`,
        `🚗 รถ: ${job.carBrand} ${job.carModel} (${job.plateNo})`,
        job.insuranceComp ? `🏢 ประกัน: ${job.insuranceComp}` : null,
        `สถานะ: ${statusTh["WAITING_PARTS"]}`,
        ``,
        `เราจะแจ้งเตือนคุณผ่าน LINE เมื่อมีการอัพเดตสถานะ 🙏`,
    ].filter(Boolean).join("\n");

    await sendLinePush(pending.lineUserId, msg).catch(e =>
        console.error("[LINE Auto Link Push] Error:", e?.message)
    );

    console.log(`[Auto Link] Linked registration ${pending.id} to job ${job.jobNo}`);
}


// POST /webhook/line — รับ event จาก LINE Platform
// Format: "ชื่อ / ทะเบียน" หรือ "ชื่อ / ทะเบียน / บ.ประกัน"
webhookRouter.post("/line", async (c) => {
    try {
        const rawBody = await c.req.text();
        const signature = c.req.header("x-line-signature") || "";

        // Verify signature
        if (LINE_SECRET) {
            if (!verifySignature(rawBody, signature)) {
                console.warn("[LINE Webhook] Invalid signature");
                return c.json({ error: "Invalid signature" }, 400);
            }
        } else if (!IS_DEV) {
            console.warn("[LINE Webhook] LINE_CHANNEL_SECRET ไม่ได้ตั้งค่า");
            return c.json({ error: "No LINE_CHANNEL_SECRET configured" }, 500);
        }

        const payload = JSON.parse(rawBody);
        const events = payload.events || [];

        for (const event of events) {
            if (event.type !== "message" || event.message?.type !== "text") continue;

            const lineUserId: string = event.source?.userId;
            const replyToken: string = event.replyToken;
            const rawText: string = event.message.text.trim();

            if (!lineUserId) continue;

            // ── "สถานะ" keyword → show job status ──
            if (rawText === "สถานะ" || rawText.toLowerCase() === "status") {
                // ค้นหา Jobs ที่ผูกกับ lineUserId นี้โดยตรง
                const jobs = await prisma.job.findMany({
                    where: {
                        lineUserId,
                        status: { notIn: ["DELIVERED", "CANCELLED"] },
                    },
                    include: {
                        parts: { orderBy: { addedAt: "asc" } },
                        repairSteps: { orderBy: { order: "asc" } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 3,
                });

                if (jobs.length === 0) {
                    await sendLineReply(replyToken, `❌ ไม่พบงานซ่อมที่ผูกกับ LINE ของคุณ\n\nกรุณาลงทะเบียนด้วย:\nชื่อ / ทะเบียนรถ / บ.ประกัน\n\nตัวอย่าง: สมชาย / กข1234 / วิริยะ\nหรือ: สมชาย / กข1234`);
                    continue;
                }

                // Build per-job status message
                const messages: string[] = [];
                const stepStatusTh: Record<string, string> = {
                    COMPLETED: "เสร็จแล้ว ✅", IN_PROGRESS: "กำลังดำเนินงาน 🔧", PENDING: "รอดำเนินงาน ⏳",
                };
                for (const job of jobs) {
                    const statusTh: Record<string, string> = {
                        WAITING_PARTS: "รออะไหล่ ⏳",
                        RECEIVED: "รับรถแล้ว 🚗", IN_PROGRESS: "กำลังซ่อม 🔧",
                        COMPLETED: "ซ่อมเสร็จ ✅", DELIVERED: "ส่งมอบแล้ว 🚚",
                    };
                    const arrived = job.parts.filter(p => p.status === "ARRIVED" || p.status === "INSTALLED").length;
                    const total = job.parts.length;
                    const insuranceInfo = job.insuranceComp ? `\n🏢 ประกัน: ${job.insuranceComp}` : "";

                    // Per-step repair detail
                    const repairLines: string[] = [];
                    if (job.status === "IN_PROGRESS" && (job as any).repairSteps?.length > 0) {
                        repairLines.push(``, `🛠️ ขั้นตอนซ่อม:`);
                        for (const rs of (job as any).repairSteps) {
                            repairLines.push(`${stepStatusTh[rs.status]?.startsWith("เสร็จ") ? "✅" : rs.status === "IN_PROGRESS" ? "🔧" : "⏳"} ${rs.label} — ${stepStatusTh[rs.status] || rs.status}`);
                        }
                    }

                    messages.push([
                        `📋 ${job.jobNo}${job.claimNo ? ` (เคลม: ${job.claimNo})` : ""}`,
                        `🚗 ${job.carBrand} ${job.carModel} (${job.plateNo})`,
                        `สถานะ: ${statusTh[job.status] || job.status}${insuranceInfo}`,
                        ...repairLines,
                        ``,
                        total > 0 ? `📦 อะไหล่ (${arrived}/${total} มาถึง):` : `📦 ยังไม่มีอะไหล่`,
                        ...job.parts.map(p => {
                            const icon = p.status === "INSTALLED" ? "✅" : p.status === "ARRIVED" ? "✅" : "⏳";
                            return `${icon} ${p.partName} x${p.quantity}`;
                        }),
                    ].join("\n"));
                }

                await sendLineReply(replyToken, messages.join("\n\n───────────\n\n"));
                continue;
            }

            // ── Rich Menu Keywords ──

            // "นัดหมาย" → นัดหมายเข้าซ่อม
            const appointmentKeywords = ["นัดหมาย", "นัดซ่อม", "จองคิว", "นัดหมายเข้าซ่อม", "booking"];
            if (appointmentKeywords.some(k => rawText.toLowerCase() === k.toLowerCase())) {
                await sendLineReply(replyToken, [
                    `📅 นัดหมายเข้าซ่อม — นันการช่าง`,
                    ``,
                    `กรุณาแจ้งข้อมูลดังนี้:`,
                    `1️⃣ ชื่อ-นามสกุล`,
                    `2️⃣ เบอร์โทรติดต่อ`,
                    `3️⃣ ยี่ห้อ/รุ่นรถ + ทะเบียน`,
                    `4️⃣ อาการ/ปัญหาเบื้องต้น`,
                    `5️⃣ วัน-เวลาที่สะดวก`,
                    ``,
                    `📞 หรือโทรนัดหมายโดยตรง:`,
                    `โทร: 099-XXX-XXXX`,
                    `🕒 เวลาทำการ: จ-ส 08:00-17:00`,
                ].join("\n"));
                continue;
            }

            // "เคลม" / "claim" → ขั้นตอนเคลมรถ
            const claimKeywords = ["เคลม", "claim", "แจ้งเคลม", "ติดต่อเคลม", "ติดต่อเคลมรถ"];
            if (claimKeywords.some(k => rawText.toLowerCase() === k.toLowerCase())) {
                await sendLineReply(replyToken, [
                    `🚗 ขั้นตอนแจ้งเคลมรถ`,
                    ``,
                    `1️⃣ แจ้งอุบัติเหตุกับบริษัทประกันของท่าน`,
                    `2️⃣ นำรถเข้ามาที่ร้าน นันการช่าง`,
                    `3️⃣ ทางร้านจะตรวจสอบและประเมินความเสียหาย`,
                    `4️⃣ ประสานงานกับบริษัทประกัน`,
                    `5️⃣ ดำเนินการซ่อมและแจ้งสถานะให้ทราบ`,
                    ``,
                    `📞 สอบถามเพิ่มเติม:`,
                    `โทร: 099-XXX-XXXX`,
                    ``,
                    `📝 ลงทะเบียนติดตามงานซ่อม:`,
                    `พิมพ์ ชื่อ / ทะเบียนรถ`,
                    `ตัวอย่าง: สมชาย / กข1234`,
                ].join("\n"));
                continue;
            }

            // "ประกัน" / "insurance" → ปรึกษาประกันภัย
            const insuranceKeywords = ["ประกัน", "insurance", "ปรึกษาประกัน", "ปรึกษาประกันภัย"];
            if (insuranceKeywords.some(k => rawText.toLowerCase() === k.toLowerCase())) {
                await sendLineReply(replyToken, [
                    `🛡️ ปรึกษาเรื่องประกันภัยรถยนต์`,
                    ``,
                    `ทางร้าน นันการช่าง รับงานประกันทุกบริษัท:`,
                    `✅ วิริยะประกันภัย`,
                    `✅ กรุงเทพประกันภัย`,
                    `✅ เมืองไทยประกันภัย`,
                    `✅ ประกันภัยไทยวิวัฒน์`,
                    `✅ และอื่นๆ อีกมากมาย`,
                    ``,
                    `📞 ต้องการปรึกษาโดยตรง:`,
                    `โทร: 099-XXX-XXXX`,
                    ``,
                    `💬 หรือพิมพ์ข้อความสอบถามได้เลยครับ`,
                ].join("\n"));
                continue;
            }

            // "สอบถาม" / "ติดต่อ" → ข้อมูลติดต่อ
            const contactKeywords = ["สอบถาม", "ติดต่อ", "สอบถามเพิ่มเติม", "contact", "ข้อมูล"];
            if (contactKeywords.some(k => rawText.toLowerCase() === k.toLowerCase())) {
                await sendLineReply(replyToken, [
                    `📍 นันการช่าง — ข้อมูลติดต่อ`,
                    ``,
                    `📞 โทร: 099-XXX-XXXX`,
                    `🕒 เวลาทำการ: จ-ส 08:00-17:00`,
                    `📍 ที่อยู่: [ที่อยู่ร้าน]`,
                    ``,
                    `💡 คำสั่งที่ใช้ได้:`,
                    `• "นัดหมาย" → นัดหมายเข้าซ่อม`,
                    `• "เคลม" → ขั้นตอนแจ้งเคลม`,
                    `• "ประกัน" → ปรึกษาประกันภัย`,
                    `• "สถานะ" → ดูสถานะงานซ่อม`,
                    ``,
                    `📝 ลงทะเบียนติดตามงาน:`,
                    `พิมพ์ ชื่อ / ทะเบียนรถ / บ.ประกัน`,
                    `ตัวอย่าง: สมชาย / กข1234 / วิริยะ`,
                ].join("\n"));
                continue;
            }

            // ── Parse format: "ชื่อ / ทะเบียน" หรือ "ชื่อ / ทะเบียน / บ.ประกัน" ──
            const parts = rawText.split(/[\/]/);
            if (parts.length < 2) {
                // ลองใช้ rawText เป็นทะเบียน เฉพาะเมื่อดูเหมือนทะเบียนรถ (สั้น + มีตัวอักษร/ตัวเลข)
                const looksLikePlate = rawText.length >= 2 && rawText.length <= 10 && /[ก-ฮa-zA-Z0-9]/.test(rawText);
                if (looksLikePlate) {
                    const normalized = normalizePlate(rawText);
                    const activeJob = await findJobByPlate(normalized);

                    if (activeJob) {
                        await linkLineToJob(activeJob, lineUserId);
                        await sendLineReply(replyToken, buildJobLinkedReply(activeJob, true));
                    }
                    // ไม่เจอ job → เงียบ (ไม่ตอบ) เพื่อไม่ให้ชนกับ auto-reply ของ LINE OA
                }
                // ข้อความทั่วไปที่ไม่ใช่ keyword → ไม่ตอบ (ปล่อยให้ LINE OA auto-reply/แชทจัดการ)
                continue;
            }

            const customerName = parts[0].trim();
            const plateRaw = parts[1].trim();
            const insuranceComp = parts[2]?.trim() || undefined;
            const normalizedPlate = normalizePlate(plateRaw);

            if (!customerName || !normalizedPlate) {
                await sendLineReply(replyToken, `❌ กรุณาระบุทั้งชื่อและทะเบียนรถ\n\nตัวอย่าง: สมชาย / กข1234\nหรือ: สมชาย / กข1234 / วิริยะ`);
                continue;
            }

            // ค้นหา Job ที่ทะเบียนตรง
            const matchedJob = await findJobByPlate(normalizedPlate);

            if (matchedJob) {
                // ✅ เจอ Job → ผูก lineUserId
                await linkLineToJob(matchedJob, lineUserId);

                // Mark registration as matched if exists
                await prisma.lineRegistration.updateMany({
                    where: { lineUserId, normalizedPlate, matched: false },
                    data: { matched: true },
                });

                await sendLineReply(replyToken, buildJobLinkedReply(matchedJob, true));
                console.log(`[LINE Webhook] Linked userId=${lineUserId} to job ${matchedJob.jobNo}`);
            } else {
                // ❌ ไม่เจอ Job → เก็บเป็น pending registration
                await prisma.lineRegistration.upsert({
                    where: {
                        lineUserId_normalizedPlate: { lineUserId, normalizedPlate },
                    },
                    create: {
                        lineUserId,
                        customerName,
                        plateNo: plateRaw,
                        normalizedPlate,
                    },
                    update: {
                        customerName,
                        plateNo: plateRaw,
                    },
                });

                await sendLineReply(replyToken, [
                    `📝 บันทึกข้อมูลเรียบร้อย`,
                    ``,
                    `คุณ ${customerName}`,
                    `ทะเบียน ${plateRaw}`,
                    insuranceComp ? `ประกัน ${insuranceComp}` : null,
                    ``,
                    `ยังไม่พบงานซ่อมในระบบตอนนี้ แต่เราได้บันทึกข้อมูลไว้แล้ว`,
                    `เมื่อทางร้านสร้างงานซ่อมที่ตรงกัน ระบบจะแจ้งเตือนคุณอัตโนมัติ 🙏`,
                ].filter(Boolean).join("\n"));

                console.log(`[LINE Webhook] Stored pending registration for ${customerName} (${plateRaw})`);
            }
        }

        return c.json({ ok: true });
    } catch (error: any) {
        console.error("[LINE Webhook] Error:", error?.message);
        return c.json({ ok: true });
    }
});

// ── Helper Functions ──

/** ค้นหา Job ที่ active โดย plateNo (normalized) */
async function findJobByPlate(normalizedPlate: string) {
    const activeJobs = await prisma.job.findMany({
        where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
        include: { parts: true },
        orderBy: { createdAt: "desc" },
    });
    return activeJobs.find(j => normalizePlate(j.plateNo) === normalizedPlate) || null;
}

/** ผูก lineUserId เข้ากับ Job */
async function linkLineToJob(job: any, lineUserId: string) {
    const isNewLink = job.lineUserId !== lineUserId;
    if (isNewLink) {
        await prisma.job.update({
            where: { id: job.id },
            data: { lineUserId, lineLinkedAt: new Date() },
        });
    }
}

/** สร้างข้อความตอบกลับหลังลิงก์ Job สำเร็จ */
function buildJobLinkedReply(job: any, isNewLink: boolean): string {
    const statusTh: Record<string, string> = {
        WAITING_PARTS: "รออะไหล่ ⏳",
        RECEIVED: "รับรถแล้ว 🚗",
        IN_PROGRESS: "กำลังซ่อม 🔧",
        COMPLETED: "ซ่อมเสร็จ ✅",
        DELIVERED: "ส่งมอบแล้ว 🚚",
    };

    return [
        isNewLink ? `✅ ลงทะเบียนสำเร็จ!` : `📋 สถานะล่าสุด`,
        ``,
        `📋 Job: ${job.jobNo}`,
        `🚗 ${job.carBrand} ${job.carModel} (${job.plateNo})`,
        job.insuranceComp ? `🏢 ประกัน: ${job.insuranceComp}` : null,
        `สถานะ: ${statusTh[job.status] || job.status}`,
        ``,
        `เราจะแจ้งเตือนคุณผ่าน LINE เมื่อมีการอัพเดตสถานะ 🙏`,
    ].filter(Boolean).join("\n");
}

// Export helpers
export { sendLinePush };
