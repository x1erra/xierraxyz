import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  if (host.includes("go.xierra.xyz") && !request.nextUrl.pathname.startsWith("/GO")) {
    return NextResponse.redirect(new URL("/GO", request.url));
  }
}
