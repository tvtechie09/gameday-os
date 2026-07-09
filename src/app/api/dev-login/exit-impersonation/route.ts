import { NextResponse, type NextRequest } from "next/server";
import { canImpersonate } from "@/lib/access/capabilities";
import { impersonationCookieName } from "@/lib/access/session-cookie";
import { getActingContext } from "@/lib/access/session";

// End the synthetic venue+role preview: clear the impersonation cookie so session
// resolution falls back to the real base user (the super_admin). Authorized on
// the REAL base user's canImpersonate capability — resolved while ignoring the
// impersonation cookie, so a low-permission preview can never block exit.
export async function POST(request: NextRequest) {
  const actingCtx = await getActingContext();
  const home = actingCtx && canImpersonate(actingCtx) ? "/admin/impersonation" : "/";

  const response = NextResponse.redirect(new URL(home, request.url));
  response.cookies.delete(impersonationCookieName);
  return response;
}
