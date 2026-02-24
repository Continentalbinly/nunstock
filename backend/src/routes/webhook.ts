import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
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

/** ส่ง Push Message ไปหา userId */
async function sendLinePush(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
    if (!LINE_TOKEN) return { ok: false, error: "ไม่พบ LINE_CHANNEL_ACCESS_TOKEN" };
    try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LINE_TOKEN}`,
            },
            body: JSON.stringify({
                to,
                messages: [{ type: "text", text }],
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as any;
            return { ok: false, error: err?.message || `LINE API error: ${res.status}` };
        }
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || "เชื่อมต่อ LINE ไม่ได้" };
    }
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
        case "ORDERED":
            return [
                `📦 อัพเดตสถานะจาก นันการช่าง`,
                ``,
                `เรียนคุณ ${claim.customerName}`,
                `ทางร้านได้ทำการสั่งอะไหล่ให้คุณแล้วครับ/ค่ะ`,
                ``,
                `📋 เลขเคลม: ${claimNo}`,
                `🚗 รถ: ${car} (${plate})`,
                ``,
                `เราจะแจ้งเตือนอีกครั้งเมื่ออะไหล่มาถึง 🙏`,
            ].join("\n");

        case "ARRIVED":
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

// POST /webhook/line — รับ event จาก LINE Platform
webhookRouter.post("/line", async (c) => {
    try {
        const rawBody = await c.req.text();
        const signature = c.req.header("x-line-signature") || "";

        // Verify signature (ข้ามใน dev mode ถ้าไม่มี secret)
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
            // รับเฉพาะ text message
            if (event.type !== "message" || event.message?.type !== "text") continue;

            const lineUserId: string = event.source?.userId;
            const replyToken: string = event.replyToken;
            const rawText: string = event.message.text.trim();

            if (!lineUserId) continue;

            // Normalize text → ใช้เป็น search key
            const normalized = normalizePlate(rawText);

            // ค้นหาเคลมที่ยังเปิดอยู่ด้วยทะเบียนรถ
            // ดึงทุก claim ที่ยังไม่ COMPLETED แล้วเปรียบเทียบ normalized plate
            const activeClaims = await prisma.insuranceClaim.findMany({
                where: { status: { not: "COMPLETED" } },
                include: { items: true },
                orderBy: { createdAt: "desc" },
            });

            // หา claim ที่ normalize plate ตรงกัน
            const matched = activeClaims.find(
                (c) => normalizePlate(c.plateNo) === normalized
            );

            if (!matched) {
                // ลองหาใน COMPLETED ด้วย
                const completedClaims = await prisma.insuranceClaim.findMany({
                    where: { status: "COMPLETED" },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                });
                const completedMatch = completedClaims.find(
                    (c) => normalizePlate(c.plateNo) === normalized
                );

                if (completedMatch) {
                    await sendLineReply(
                        replyToken,
                        `✅ อะไหล่รถทะเบียน ${rawText} ของคุณดำเนินการเสร็จสิ้นแล้วครับ/ค่ะ\n\nหากมีข้อสงสัยกรุณาติดต่อเจ้าหน้าที่ 😊`
                    );
                } else {
                    await sendLineReply(
                        replyToken,
                        `❌ ไม่พบทะเบียน "${rawText}" ในระบบครับ/ค่ะ\n\nกรุณาตรวจสอบทะเบียนรถและลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่`
                    );
                }
                continue;
            }

            // Update lineUserId ใน claim
            const isNewLink = (matched as any).lineUserId !== lineUserId;
            await prisma.insuranceClaim.update({
                where: { id: matched.id },
                data: {
                    ...(({ lineUserId, lineLinkedAt: isNewLink ? new Date() : undefined }) as any),
                },
            });

            // Reply ยืนยัน
            const statusTh: Record<string, string> = {
                PENDING: "รอดำเนินการ 🕐",
                ORDERED: "สั่งอะไหล่แล้ว 📦",
                ARRIVED: "อะไหล่มาถึง 🎉",
                NOTIFIED: "แจ้งลูกค้าแล้ว ✅",
            };

            const replyText = isNewLink
                ? [
                    `✅ ลงทะเบียนสำเร็จ!`,
                    ``,
                    `รถทะเบียน ${matched.plateNo} (${matched.carBrand} ${matched.carModel})`,
                    `สถานะปัจจุบัน: ${statusTh[matched.status] || matched.status}`,
                    ``,
                    `เราจะแจ้งเตือนคุณผ่าน LINE เมื่อมีการอัพเดตสถานะ 🙏`,
                ].join("\n")
                : [
                    `📋 สถานะล่าสุด`,
                    ``,
                    `รถทะเบียน ${matched.plateNo} (${matched.carBrand} ${matched.carModel})`,
                    `สถานะ: ${statusTh[matched.status] || matched.status}`,
                ].join("\n");

            await sendLineReply(replyToken, replyText);

            console.log(`[LINE Webhook] Linked userId=${lineUserId} to claim ${matched.claimNo} (plate: ${matched.plateNo})`);
        }

        return c.json({ ok: true });
    } catch (error: any) {
        console.error("[LINE Webhook] Error:", error?.message);
        // LINE ต้องการ 200 เสมอ ไม่งั้นจะ retry
        return c.json({ ok: true });
    }
});

// Export helpers สำหรับใช้ใน claims.ts
export { sendLinePush };
