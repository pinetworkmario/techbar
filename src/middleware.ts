import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "pi_sid";

function publicOrigin(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const tok = req.cookies.get(SESSION_COOKIE)?.value;
  if (!tok) {
    const login = new URL("/login", publicOrigin(req));
    login.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/tech/:path*"],
};
