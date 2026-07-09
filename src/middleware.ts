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

// Server-side login wall + /admin capability guards. Resolves the Supabase user
// via getUser() (verified server-side); unauthenticated users are redirected to
// /login. When dev-login is enabled a valid gameday_session cookie also
// satisfies the wall so the staging break-glass path keeps working.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const devLogin = isDevLoginEnabled();

  // Refresh the Supabase session on every request so tokens stay fresh and
  // getUser() is accurate. `response` carries any refreshed auth cookies.
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  // Public paths: no auth required, but still return `response` so token
  // refresh cookies are persisted.
  if (isAlwaysPublic(pathname) || (devLogin && isDevLoginPath(pathname))) {
    return response;
  }

  // Dev-login break-glass: a valid signed session cookie satisfies the wall
  // (dev/staging only).
  const devPayload = devLogin ? decodeSession(request.cookies.get(sessionCookieName)?.value) : null;

  // Real auth: verify the Supabase user server-side.
  let authedUser: { id: string } | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authedUser = user ? { id: user.id } : null;
  }

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
