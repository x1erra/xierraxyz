import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  if (host === "go.xierra.xyz" && !request.nextUrl.pathname.startsWith("/GO")) {
    const url = request.nextUrl.clone();
    url.pathname = "/GO";
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: "/:path*",
};
