import { NextResponse, type NextRequest } from "next/server";
import { buildAccessContext, canImpersonate, isPlatformAdmin } from "@/lib/access/capabilities";
import { findDemoUserByKey } from "@/lib/access/demo-users";
import {
  encodeSession,
  impersonatorCookieName,
  sessionCookieName,
  type SessionPayload,
} from "@/lib/access/session-cookie";
import { getActingContext } from "@/lib/access/session";

// Switch the active session into a demo user while preserving the real
// (underlying) session so "Exit Impersonation" can restore it. Guarded on the
// REAL acting user's canImpersonate capability:
//   - dev/staging: the dev-login session
//   - production: the verified Supabase auth user (a real super_admin/
//     platform_admin) — a dev-login-only or unauthenticated caller cannot reach
//     this because dev-login routes are not public in production.
export async function POST(request: NextRequest) {
  const actingCtx = await getActingContext();
  if (!actingCtx || !canImpersonate(actingCtx)) {
    return NextResponse.json({ error: "Not permitted to impersonate." }, { status: 403 });
  }

  const form = await request.formData();
  const key = String(form.get("user") ?? "");
  const target = findDemoUserByKey(key);
  if (!target) {
    return NextResponse.redirect(new URL("/admin/impersonation?error=unknown-user", request.url));
  }

  const targetCtx = buildAccessContext({
    userId: target.id,
    email: target.email,
    displayName: target.displayName,
    roleKey: target.roleKey,
    scopeType: target.scopeType,
    scopeId: target.scopeId,
    venueName: target.venueName,
  });

  const home = isPlatformAdmin(targetCtx) ? "/admin" : "/today";
  const response = NextResponse.redirect(new URL(home, request.url));

  // Snapshot the real acting user so Exit Impersonation + the banner work,
  // unless we are already impersonating (preserve the original admin).
  const existingImpersonator = request.cookies.get(impersonatorCookieName)?.value;
  if (!existingImpersonator) {
    const impersonatorPayload: SessionPayload = {
      userId: actingCtx.userId,
      email: actingCtx.email,
      displayName: actingCtx.displayName,
      roleKey: actingCtx.roleKey,
      scopeType: actingCtx.scopeType,
      scopeId: actingCtx.scopeId,
      venueId: actingCtx.venueId,
      venueName: actingCtx.venueName,
    };
    response.cookies.set(impersonatorCookieName, encodeSession(impersonatorPayload), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  response.cookies.set(
    sessionCookieName,
    encodeSession({
      userId: target.id,
      email: target.email,
      displayName: target.displayName,
      roleKey: target.roleKey,
      scopeType: target.scopeType,
      scopeId: target.scopeId,
      venueId: null,
      venueName: target.venueName,
    }),
    { httpOnly: true, sameSite: "lax", path: "/" },
  );

  return response;
}
