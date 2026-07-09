import { NextResponse, type NextRequest } from "next/server";
import {
  decodeSession,
  encodeSession,
  impersonatorCookieName,
  sessionCookieName,
} from "@/lib/access/session-cookie";

// Restore the real admin session saved before impersonation began.
export async function POST(request: NextRequest) {
  const impersonator = decodeSession(request.cookies.get(impersonatorCookieName)?.value);

  if (!impersonator) {
    return NextResponse.redirect(new URL("/dev-login", request.url));
  }

  const response = NextResponse.redirect(new URL("/admin/impersonation", request.url));
  response.cookies.set(sessionCookieName, encodeSession(impersonator), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  response.cookies.delete(impersonatorCookieName);
  return response;
}
