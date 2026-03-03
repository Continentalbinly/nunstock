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

/** สร้างข้อความ LINE สำหรับแต่ละ status */
export function buildStatusMessage(
    status: string,
    claim: { claimNo: string; customerName: string; carBrand: string; carModel: string; plateNo: string; items: { partName: string; quantity: number }[] }
): string | null {
    const plate = claim.plateNo;
    const car = `${claim.carBrand} ${claim.carModel}`;
    const claimNo = claim.claimNo;

    switch (status) {
        case "ARRIVED": {
            const itemsText = claim.items.map((i) => `• ${i.partName} x${i.quantity}`).join("\n");
            return [
                `🎉 อะไหล่มาถึงแล้ว! — นันการช่าง`,
                ``,
                `เรียนคุณ ${claim.customerName}`,
                `อะไหล่ของคุณมาถึงแล้วครับ/ค่ะ`,
                ``,
                `📋 เลขเคลม: ${claimNo}`,
                `🚗 รถ: ${car} (${plate})`,
                `📦 อะไหล่:`,
                itemsText,
                ``,
                `กรุณาติดต่อร้านเพื่อนัดรับรถ 📞`,
            ].join("\n");
        }

        case "COMPLETED":
            return [
                `✅ งานซ่อมเสร็จสิ้น — นันการช่าง`,
                ``,
                `เรียนคุณ ${claim.customerName}`,
                `งานซ่อมรถของคุณเสร็จสมบูรณ์แล้วครับ/ค่ะ`,
                ``,
                `📋 เลขเคลม: ${claimNo}`,
                `🚗 รถ: ${car} (${plate})`,
                ``,
                `ขอบคุณที่ใช้บริการ นันการช่าง 🙏`,
            ].join("\n");

        default:
            return null;
    }
}

/**
 * ตรวจสอบว่ามี LineRegistration ที่ตรงกับเคลมนี้ไหม
 * ถ้ามี → ผูก lineUserId เข้ากับ claim + push confirmation
 */
export async function checkAndLinkPendingRegistration(claim: {
    id: string; claimNo: string; customerName: string; carBrand: string; carModel: string; plateNo: string;
    items: { partName: string; quantity: number }[];
}) {
    const normalized = normalizePlate(claim.plateNo);

    // หา registration ที่ยังไม่ matched โดยเทียบจาก normalizedPlate
    const pending = await prisma.lineRegistration.findFirst({
        where: {
            normalizedPlate: normalized,
            matched: false,
        },
        orderBy: { createdAt: "desc" },
    });

    if (!pending) return;

    // ผูก registration กับ claim
    await prisma.$transaction([
        prisma.lineRegistration.update({
            where: { id: pending.id },
            data: { matched: true, matchedClaimId: claim.id },
        }),
        prisma.insuranceClaim.update({
            where: { id: claim.id },
            data: { lineUserId: pending.lineUserId, lineLinkedAt: new Date() },
        }),
    ]);

    // Push confirmation ไปหาลูกค้า
    const statusTh: Record<string, string> = {
        PENDING: "รอดำเนินการ 🕐",
        ORDERED: "สั่งอะไหล่แล้ว 📦",
        ARRIVED: "อะไหล่มาถึง 🎉",
        NOTIFIED: "แจ้งลูกค้าแล้ว ✅",
    };

    const msg = [
        `✅ พบเคลมตรงกับข้อมูลของคุณ!`,
        ``,
        `📋 เลขเคลม: ${claim.claimNo}`,
        `🚗 รถ: ${claim.carBrand} ${claim.carModel} (${claim.plateNo})`,
        `สถานะ: ${statusTh["PENDING"] || "รอดำเนินการ"}`,
        ``,
        `เราจะแจ้งเตือนคุณผ่าน LINE เมื่อมีการอัพเดตสถานะ 🙏`,
    ].join("\n");

    await sendLinePush(pending.lineUserId, msg).catch(e =>
        console.error("[LINE Auto Link Push] Error:", e?.message)
    );

    console.log(`[Auto Link] Linked registration ${pending.id} to claim ${claim.claimNo}`);
}


// POST /webhook/line — รับ event จาก LINE Platform
// Format: "ชื่อ / ทะเบียน" เช่น "สมชาย / กข1234"
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

            // ── "สถานะ" keyword → show job + per-part status ──
            if (rawText === "สถานะ" || rawText.toLowerCase() === "status") {
                // Find jobs linked to this LINE user (via claim.lineUserId)
                const jobs = await prisma.job.findMany({
                    where: {
                        status: { not: "DELIVERED" },
                        claim: { lineUserId },
                    },
                    include: {
                        parts: { orderBy: { addedAt: "asc" } },
                        claim: { select: { claimNo: true, insuranceComp: true } },
                        repairSteps: { orderBy: { order: "asc" } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 3,
                });

                if (jobs.length === 0) {
                    // Fallback: check claims directly
                    const claim = await prisma.insuranceClaim.findFirst({
                        where: { lineUserId, status: { not: "COMPLETED" } },
                        include: { items: true },
                        orderBy: { createdAt: "desc" },
                    });
                    if (claim) {
                        const statusTh: Record<string, string> = { PENDING: "รอดำเนินการ 🕐", ORDERED: "สั่งอะไหล่แล้ว 📦", ARRIVED: "อะไหล่มาถึง 🎉", NOTIFIED: "แจ้งลูกค้าแล้ว ✅" };
                        await sendLineReply(replyToken, [
                            `📋 สถานะเคลม: ${claim.claimNo}`,
                            `🚗 ${claim.carBrand} ${claim.carModel} (${claim.plateNo})`,
                            `สถานะ: ${statusTh[claim.status] || claim.status}`,
                            ``, `📦 อะไหล่:`,
                            ...claim.items.map(i => `• ${i.partName} x${i.quantity}`),
                        ].join("\n"));
                    } else {
                        await sendLineReply(replyToken, `❌ ไม่พบงานซ่อมที่ผูกกับ LINE ของคุณ\n\nกรุณาลงทะเบียนด้วย:\nชื่อ / ทะเบียนรถ\n\nตัวอย่าง: สมชาย / กข1234`);
                    }
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
                    const insuranceInfo = job.claim?.insuranceComp ? `\n🏢 ประกัน: ${job.claim.insuranceComp}` : "";

                    // Per-step repair detail
                    const repairLines: string[] = [];
                    if (job.status === "IN_PROGRESS" && (job as any).repairSteps?.length > 0) {
                        repairLines.push(``, `🛠️ ขั้นตอนซ่อม:`);
                        for (const rs of (job as any).repairSteps) {
                            repairLines.push(`${stepStatusTh[rs.status]?.startsWith("เสร็จ") ? "✅" : rs.status === "IN_PROGRESS" ? "🔧" : "⏳"} ${rs.label} — ${stepStatusTh[rs.status] || rs.status}`);
                        }
                    }

                    messages.push([
                        `📋 ${job.jobNo}${job.claim ? ` (เคลม: ${job.claim.claimNo})` : ""}`,
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

            // Parse format: "ชื่อ / ทะเบียน" หรือ "ชื่อ/ทะเบียน"
            const parts = rawText.split(/[\/]/);
            if (parts.length < 2) {
                // Fallback: ลองใช้ rawText เป็นทะเบียนเลย (เหมือนระบบเดิม)
                const normalized = normalizePlate(rawText);

                const activeClaim = (await prisma.insuranceClaim.findMany({
                    where: { status: { not: "COMPLETED" } },
                    include: { items: true },
                    orderBy: { createdAt: "desc" },
                })).find(c => normalizePlate(c.plateNo) === normalized);

                if (activeClaim) {
                    // เจอเคลมจากทะเบียน → ผูก lineUserId + ตอบสถานะ
                    const isNewLink = (activeClaim as any).lineUserId !== lineUserId;
                    await prisma.insuranceClaim.update({
                        where: { id: activeClaim.id },
                        data: { lineUserId, lineLinkedAt: isNewLink ? new Date() : undefined } as any,
                    });

                    const statusTh: Record<string, string> = { PENDING: "รอดำเนินการ 🕐", ORDERED: "สั่งอะไหล่แล้ว 📦", ARRIVED: "อะไหล่มาถึง 🎉", NOTIFIED: "แจ้งลูกค้าแล้ว ✅" };
                    await sendLineReply(replyToken, [
                        isNewLink ? `✅ ลงทะเบียนสำเร็จ!` : `📋 สถานะล่าสุด`,
                        ``, `รถทะเบียน ${activeClaim.plateNo} (${activeClaim.carBrand} ${activeClaim.carModel})`,
                        `สถานะ: ${statusTh[activeClaim.status] || activeClaim.status}`,
                        ``, `เราจะแจ้งเตือนคุณผ่าน LINE เมื่อมีการอัพเดตสถานะ 🙏`,
                    ].join("\n"));
                } else {
                    // ไม่เจอ → บอก format ที่ถูกต้อง
                    await sendLineReply(replyToken,
                        `📝 กรุณาส่งข้อมูลในรูปแบบ:\nชื่อ / ทะเบียนรถ\n\nตัวอย่าง: สมชาย / กข1234\n\nหรือพิมพ์เลขทะเบียนรถอย่างเดียวก็ได้ครับ`
                    );
                }
                continue;
            }

            const customerName = parts[0].trim();
            const plateRaw = parts.slice(1).join("/").trim();
            const normalizedPlate = normalizePlate(plateRaw);

            if (!customerName || !normalizedPlate) {
                await sendLineReply(replyToken, `❌ กรุณาระบุทั้งชื่อและทะเบียนรถ\n\nตัวอย่าง: สมชาย / กข1234`);
                continue;
            }

            // ค้นหาเคลมที่ตรงกับ ชื่อ + ทะเบียน
            const activeClaims = await prisma.insuranceClaim.findMany({
                where: { status: { not: "COMPLETED" } },
                include: { items: true },
                orderBy: { createdAt: "desc" },
            });

            const matched = activeClaims.find(
                (c) => normalizePlate(c.plateNo) === normalizedPlate
            );

            if (matched) {
                // ✅ เจอเคลม → ผูก lineUserId
                const isNewLink = (matched as any).lineUserId !== lineUserId;
                await prisma.insuranceClaim.update({
                    where: { id: matched.id },
                    data: { lineUserId, lineLinkedAt: isNewLink ? new Date() : undefined } as any,
                });

                // Mark registration as matched if exists
                await prisma.lineRegistration.updateMany({
                    where: { lineUserId, normalizedPlate, matched: false },
                    data: { matched: true, matchedClaimId: matched.id },
                });

                const statusTh: Record<string, string> = {
                    PENDING: "รอดำเนินการ 🕐", ORDERED: "สั่งอะไหล่แล้ว 📦",
                    ARRIVED: "อะไหล่มาถึง 🎉", NOTIFIED: "แจ้งลูกค้าแล้ว ✅",
                };

                await sendLineReply(replyToken, [
                    `✅ ลงทะเบียนสำเร็จ!`,
                    ``,
                    `คุณ ${matched.customerName}`,
                    `รถทะเบียน ${matched.plateNo} (${matched.carBrand} ${matched.carModel})`,
                    `สถานะปัจจุบัน: ${statusTh[matched.status] || matched.status}`,
                    ``,
                    `เราจะแจ้งเตือนคุณผ่าน LINE เมื่อมีการอัพเดตสถานะ 🙏`,
                ].join("\n"));

                console.log(`[LINE Webhook] Linked userId=${lineUserId} to claim ${matched.claimNo}`);
            } else {
                // ❌ ไม่เจอเคลม → เก็บเป็น pending registration
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
                    ``,
                    `ยังไม่พบเคลมในระบบตอนนี้ แต่เราได้บันทึกข้อมูลไว้แล้ว`,
                    `เมื่อทางร้านสร้างเคลมที่ตรงกัน ระบบจะแจ้งเตือนคุณอัตโนมัติ 🙏`,
                ].join("\n"));

                console.log(`[LINE Webhook] Stored pending registration for ${customerName} (${plateRaw})`);
            }
        }

        return c.json({ ok: true });
    } catch (error: any) {
        console.error("[LINE Webhook] Error:", error?.message);
        return c.json({ ok: true });
    }
});

// Export helpers สำหรับใช้ใน claims.ts
export { sendLinePush };
