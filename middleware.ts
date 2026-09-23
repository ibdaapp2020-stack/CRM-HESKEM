import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = process.env.AUTH_COOKIE || "ibda_session";

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "ibda-crm-dev-secret-change-in-production-2026",
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;
  let role: string | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      role = typeof payload.role === "string" ? payload.role : null;
    } catch {
      role = null;
    }
  }

  if (pathname.startsWith("/office")) {
    if (role !== "STAFF") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/portal")) {
    if (role !== "CLIENT") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login" && role) {
    const url = request.nextUrl.clone();
    url.pathname = role === "STAFF" ? "/office" : "/portal";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/office/:path*", "/portal/:path*", "/login"],
};
