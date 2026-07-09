import { NextResponse, type NextRequest } from "next/server";
import { buildAccessContext } from "@/lib/access/capabilities";
import { getRoleHome, guardForAdminPath } from "@/lib/access/navigation";
import { decodeSession, sessionCookieName } from "@/lib/access/session-cookie";

// Server-side route guards. Non-permitted users hitting an /admin/* URL
// directly are redirected to their role home (not just missing the nav link).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const payload = decodeSession(request.cookies.get(sessionCookieName)?.value);
  const ctx = payload
    ? buildAccessContext({
        userId: payload.userId,
        email: payload.email,
        displayName: payload.displayName,
        roleKey: payload.roleKey,
        scopeType: payload.scopeType,
        scopeId: payload.scopeId,
        venueId: payload.venueId,
        venueName: payload.venueName,
      })
    : null;

  if (!ctx) {
    const loginUrl = new URL("/dev-login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const guard = guardForAdminPath(pathname);
  if (!guard(ctx)) {
    const home = new URL(getRoleHome(ctx), request.url);
    home.searchParams.set("denied", pathname);
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
