import { NextResponse, type NextRequest } from "next/server";
import { impersonationCookieName, impersonatorCookieName, sessionCookieName } from "@/lib/access/session-cookie";

// Legacy dev-login logout. The primary sign-out is /logout; this remains for
// the dev-login flow and clears the dev-login cookies before returning to the
// login wall.
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(sessionCookieName);
  response.cookies.delete(impersonatorCookieName);
  response.cookies.delete(impersonationCookieName);
  return response;
}
