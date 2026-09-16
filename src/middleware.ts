import { NextResponse, type NextRequest } from "next/server";
import { buildAccessContext } from "@/lib/access/capabilities";
import { isDevLoginEnabled } from "@/lib/access/env";
import { getRoleHome, guardForAdminPath } from "@/lib/access/navigation";
import { decodeSession, sessionCookieName } from "@/lib/access/session-cookie";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/auth-middleware";

// Paths that never require authentication (the login wall itself, auth flow,
// and the no-access screen).
function isAlwaysPublic(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/no-access" ||
    pathname === "/logout" ||
    pathname.startsWith("/auth/")
  );
}

// Paths that are public ONLY when dev-login is enabled (dev/staging).
function isDevLoginPath(pathname: string): boolean {
  return pathname === "/dev-login" || pathname.startsWith("/api/dev-login/");
}

// The venue product's public surface: QR field pages, scoreboards, TV
// displays, venue pages, the scorekeeper pad, and the read/write APIs those
// pages use. These are reachable by families and TVs with no account.
const PUBLIC_CONTENT_PREFIXES = [
  "/fields/",
  "/scoreboard/",
  "/display/",
  "/venue/",
  "/venues/",
  "/score/",
  "/officiate/",
  "/demo/",
  "/api/score/",
  "/api/scoreboard/",
  "/api/display/",
  "/api/weather/",
  "/api/follows",
  "/api/field-page-views",
  "/api/resource-activations",
  "/api/volunteer-roles",
  "/api/sponsor-analytics/",
  "/api/integrations/daktronics/readings",
  "/api/integrations/schedule",
  "/display-sw.js"
];

function isPublicContent(pathname: string): boolean {
  // The general demo showcase is public, but the NLSA tenant is deliberately
  // private and must pass normal Supabase Auth plus its server-side role guard.
  if (pathname === "/demo/nlsa" || pathname.startsWith("/demo/nlsa/")) return false;
  if (pathname.startsWith("/api/venues/") && pathname.endsWith("/mode")) return true;
  return PUBLIC_CONTENT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

// Server-side login wall + /admin capability guards. Resolves the Supabase user
// via getUser() (verified server-side); unauthenticated users are redirected to
// /login. When dev-login is enabled a valid gameday_session cookie also
// satisfies the wall so the staging break-glass path keeps working.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const devLogin = isDevLoginEnabled();

  // Refresh the Supabase session on every request so tokens stay fresh and
  // getUser() is accurate. `response` carries any refreshed auth cookies.
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  // Public paths: no auth required, but still return `response` so token
  // refresh cookies are persisted.
  if (isAlwaysPublic(pathname) || isPublicContent(pathname) || (devLogin && isDevLoginPath(pathname))) {
    return getResponse();
  }

  // Dev-login break-glass: a valid signed session cookie satisfies the wall
  // (dev/staging only).
  const devPayload = devLogin ? await decodeSession(request.cookies.get(sessionCookieName)?.value) : null;

  // Authenticated responses must never be reused by the CDN for another
  // request. Supabase also supplies refresh-specific cache headers through the
  // middleware client's setAll callback. getUser() verifies the access token
  // with Supabase Auth; the extra network hop is acceptable for this protected
  // pilot and avoids relying on an edge-local claims refresh path.
  let authedUser: { id: string } | null = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    authedUser = data.user ? { id: data.user.id } : null;
  }

  // Auth validation may refresh the token and replace the middleware response.
  // Resolve it only after authentication so Set-Cookie and request-cookie
  // forwarding are not lost.
  const response = getResponse();
  response.headers.set("Cache-Control", "private, no-store");

  if (!devPayload && !authedUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin capability guards. For dev-login cookie sessions we enforce the
  // per-route guard here from the edge-safe catalog context. For real Supabase
  // users the full capability context requires a DB lookup, so the guard runs
  // in the admin layout/pages (AppFrame -> resolveSession) after auth.
  if (pathname.startsWith("/admin") && devPayload) {
    const ctx = buildAccessContext({
      userId: devPayload.userId,
      email: devPayload.email,
      displayName: devPayload.displayName,
      roleKey: devPayload.roleKey,
      scopeType: devPayload.scopeType,
      scopeId: devPayload.scopeId,
      venueId: devPayload.venueId,
      venueName: devPayload.venueName,
    });
    const guard = guardForAdminPath(pathname);
    if (!guard(ctx)) {
      const home = new URL(getRoleHome(ctx), request.url);
      home.searchParams.set("denied", pathname);
      return NextResponse.redirect(home);
    }
  }

  return response;
}

export const config = {
  // Run on everything except Next.js internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)$).*)"],
};
