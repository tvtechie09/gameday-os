import { NextResponse, type NextRequest } from "next/server";
import { canImpersonate } from "@/lib/access/capabilities";
import {
  encodeImpersonation,
  impersonationCookieName,
  type ImpersonationPayload,
} from "@/lib/access/session-cookie";
import { getActingContext } from "@/lib/access/session";

// Venue-agnostic roles can be previewed without selecting a venue (platform
// scope). Every other role requires a venue.
const platformScopedRoles = new Set(["super_admin", "platform_admin", "organization_admin"]);

// Start a synthetic venue+role preview. No fake user is created: we store only
// the selection ({ venueId, roleKey, startedByUserId, startedAt }) in an
// HTTP-only cookie. Capabilities are derived from the selected role at session
// resolution time, and only when the REAL base user can impersonate.
//
// Gated on the REAL acting user's canImpersonate capability (super_admin) — NOT
// on the non-prod dev-login flag. This is a legitimate production feature:
//   - production: the verified Supabase auth user (a real super_admin)
//   - dev/staging: the dev-login break-glass session
export async function POST(request: NextRequest) {
  const actingCtx = await getActingContext();
  if (!actingCtx || !canImpersonate(actingCtx)) {
    return NextResponse.json({ error: "Not permitted to impersonate." }, { status: 403 });
  }

  const form = await request.formData();
  const roleKey = String(form.get("roleKey") ?? "").trim();
  const venueId = String(form.get("venueId") ?? "").trim() || null;

  if (!roleKey) {
    return NextResponse.redirect(new URL("/admin/impersonation?error=missing-role", request.url));
  }

  if (!venueId && !platformScopedRoles.has(roleKey)) {
    return NextResponse.redirect(new URL("/admin/impersonation?error=missing-venue", request.url));
  }

  const selection: ImpersonationPayload = {
    venueId,
    roleKey,
    startedByUserId: actingCtx.userId,
    startedAt: new Date().toISOString(),
  };

  // Previewed roles rarely have admin access; land on Today's Operations so the
  // no-access guard is never hit immediately after starting.
  const response = NextResponse.redirect(new URL("/today", request.url));
  response.cookies.set(impersonationCookieName, encodeImpersonation(selection), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
