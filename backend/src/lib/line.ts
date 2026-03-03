const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/** ส่ง Push Message ไปหา LINE userId */
export async function sendLinePush(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
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
