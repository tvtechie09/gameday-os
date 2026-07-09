import { NextResponse, type NextRequest } from "next/server";
import { isDevLoginEnabled } from "@/lib/access/env";
import {
  decodeSession,
  encodeSession,
  impersonatorCookieName,
  sessionCookieName,
} from "@/lib/access/session-cookie";

// End impersonation and return to the real underlying session.
//   - dev/staging: restore the dev-login admin snapshot into gameday_session.
//   - production: drop both cookies so session resolution falls back to the
//     real Supabase auth user.
export async function POST(request: NextRequest) {
  const impersonator = decodeSession(request.cookies.get(impersonatorCookieName)?.value);

  if (!impersonator) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(new URL("/admin/impersonation", request.url));

  if (isDevLoginEnabled()) {
    response.cookies.set(sessionCookieName, encodeSession(impersonator), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    response.cookies.delete(sessionCookieName);
  }
  response.cookies.delete(impersonatorCookieName);
  return response;
}
