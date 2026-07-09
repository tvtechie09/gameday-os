import { NextResponse, type NextRequest } from "next/server";
import { buildAccessContext, canImpersonate, isPlatformAdmin } from "@/lib/access/capabilities";
import { findDemoUserByKey } from "@/lib/access/demo-users";
import {
  decodeSession,
  encodeSession,
  impersonatorCookieName,
  sessionCookieName,
} from "@/lib/access/session-cookie";
import { isDevLoginEnabled } from "@/lib/access/session";

// Admin-only: switch the active session into a demo user while preserving the
// real admin session in a separate cookie so "Exit Impersonation" can restore
// it. Guarded on the CURRENT session's canImpersonate capability.
export async function POST(request: NextRequest) {
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: "Dev login is disabled." }, { status: 403 });
  }

  const current = decodeSession(request.cookies.get(sessionCookieName)?.value);
  const currentCtx = current
    ? buildAccessContext({
        userId: current.userId,
        email: current.email,
        displayName: current.displayName,
        roleKey: current.roleKey,
        scopeType: current.scopeType,
        scopeId: current.scopeId,
        venueId: current.venueId,
        venueName: current.venueName,
      })
    : null;

  if (!currentCtx || !canImpersonate(currentCtx)) {
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

  // Preserve the real admin session (only if we are not already impersonating).
  const existingImpersonator = request.cookies.get(impersonatorCookieName)?.value;
  if (!existingImpersonator) {
    response.cookies.set(impersonatorCookieName, encodeSession(current!), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  response.cookies.set(sessionCookieName, encodeSession({
    userId: target.id,
    email: target.email,
    displayName: target.displayName,
    roleKey: target.roleKey,
    scopeType: target.scopeType,
    scopeId: target.scopeId,
    venueId: null,
    venueName: target.venueName,
  }), { httpOnly: true, sameSite: "lax", path: "/" });

  return response;
}
