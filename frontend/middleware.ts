import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1100";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // ส่ง x-pathname header เพื่อให้ root layout อ่าน pathname ได้
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", pathname);

    // public paths — ผ่านได้เลย ไม่ต้อง auth
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        // ถ้า login อยู่แล้ว ให้ redirect กลับหน้าหลัก
        const existingToken = req.cookies.get("nunstock_token")?.value;
        if (existingToken && pathname.startsWith("/login")) {
            return NextResponse.redirect(new URL("/", req.url));
        }
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const token = req.cookies.get("nunstock_token")?.value;

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Cookie: `nunstock_token=${token}` },
            cache: "no-store",
        });
        if (!res.ok) throw new Error("Unauthorized");
        return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("nunstock_token");
        return response;
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
