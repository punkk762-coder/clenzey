import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname)
    || pathname.startsWith("/_next")
    || pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const hasRefreshSession = Boolean(request.cookies.get("rft_admin")?.value);

  if (!hasRefreshSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
