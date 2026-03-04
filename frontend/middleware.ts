import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // public paths — ผ่านได้เลย ไม่ต้อง auth
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        // ถ้า login อยู่แล้ว ให้ redirect กลับหน้าหลัก
        const existingToken = req.cookies.get("nunstock_token")?.value;
        if (existingToken && pathname.startsWith("/login")) {
            return NextResponse.redirect(new URL("/", req.url));
        }
        return NextResponse.next();
    }

    const token = req.cookies.get("nunstock_token")?.value;

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Token exists → let the page load immediately
    // AuthProvider จะ validate token แบบ non-blocking ฝั่ง client
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api|manifest\\.json|sw\\.js|icons/).*)"],
};
