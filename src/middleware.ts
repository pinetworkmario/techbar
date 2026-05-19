import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "pi_sid";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const tok = req.cookies.get(SESSION_COOKIE)?.value;
  if (!tok) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
};
