import { NextResponse, type NextRequest } from "next/server";
import { actorFromDevSession } from "@/lib/access/actor";
import { resolveHostedActor } from "@/lib/access/hosted-actor";
import { isDevLoginEnabled } from "@/lib/access/env";
import { getRoleHome, guardForAdminPath } from "@/lib/access/navigation";
import { decodeSession, sessionCookieName } from "@/lib/access/session-cookie";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/auth-middleware";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function isAlwaysPublic(pathname: string): boolean {
  return pathname === "/login"
    || pathname === "/no-access"
    || pathname === "/logout"
    || pathname.startsWith("/auth/");
}

function isDevLoginPath(pathname: string): boolean {
  return pathname === "/dev-login" || pathname.startsWith("/api/dev-login/");
}

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
  "/display-sw.js",
];

function isPublicContent(pathname: string): boolean {
  if (pathname.startsWith("/api/venues/") && pathname.endsWith("/mode")) return true;
  return PUBLIC_CONTENT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const devLogin = isDevLoginEnabled();
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  if (isAlwaysPublic(pathname) || isPublicContent(pathname) || (devLogin && isDevLoginPath(pathname))) {
    return response;
  }

  const devPayload = devLogin ? await decodeSession(request.cookies.get(sessionCookieName)?.value) : null;
  let authedUser: { id: string; email: string } | null = null;
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    authedUser = user ? { id: user.id, email: user.email ?? "" } : null;
  }

  if (!devPayload && !authedUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Both authentication mechanisms now converge on one AccessContext before
  // any route decision. Hosted resolution is DB-backed and fail-closed; being
  // authenticated is never treated as being authorized.
  let ctx = devPayload ? actorFromDevSession(devPayload) : null;
  if (!ctx && authedUser) {
    try {
      ctx = await resolveHostedActor(authedUser, getSupabaseAdminClient());
    } catch {
      ctx = null;
    }
  }

  if (!ctx) {
    return NextResponse.redirect(new URL("/no-access", request.url));
  }

  if (pathname.startsWith("/admin")) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)$).*)"],
};
