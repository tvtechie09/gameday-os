import { NextResponse, type NextRequest } from "next/server";
import { buildAccessContext } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { findDemoUserByKey } from "@/lib/access/demo-users";
import {
  encodeSession,
  impersonationCookieName,
  impersonatorCookieName,
  sessionCookieName,
} from "@/lib/access/session-cookie";
import { isDevLoginEnabled } from "@/lib/access/session";

export async function POST(request: NextRequest) {
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: "Dev login is disabled." }, { status: 403 });
  }

  const form = await request.formData();
  const key = String(form.get("user") ?? "");
  const demoUser = findDemoUserByKey(key);

  if (!demoUser) {
    return NextResponse.redirect(new URL("/dev-login?error=unknown-user", request.url));
  }

  const ctx = buildAccessContext({
    userId: demoUser.id,
    email: demoUser.email,
    displayName: demoUser.displayName,
    roleKey: demoUser.roleKey,
    scopeType: demoUser.scopeType,
    scopeId: demoUser.scopeId,
    venueName: demoUser.venueName,
  });

  // Was an inline copy of getRoleHome's old logic, which went stale the moment
  // venue operators started landing on the Command Center instead of /today.
  // Use the shared resolver so sign-in and the nav can't disagree.
  const response = NextResponse.redirect(new URL(getRoleHome(ctx), request.url));
  response.cookies.set(sessionCookieName, encodeSession({
    userId: demoUser.id,
    email: demoUser.email,
    displayName: demoUser.displayName,
    roleKey: demoUser.roleKey,
    scopeType: demoUser.scopeType,
    scopeId: demoUser.scopeId,
    venueId: null,
    venueName: demoUser.venueName,
  }), { httpOnly: true, sameSite: "lax", path: "/" });
  // Starting a fresh session ends any prior impersonation.
  response.cookies.delete(impersonatorCookieName);
  response.cookies.delete(impersonationCookieName);
  return response;
}
