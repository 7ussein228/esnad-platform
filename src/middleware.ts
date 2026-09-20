import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (req.nextUrl.pathname.startsWith("/dashboard") && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
