import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { impersonationCookieName, impersonatorCookieName, sessionCookieName } from "@/lib/access/session-cookie";

// Sign out of Supabase and clear ALL session cookies: Supabase auth cookies
// (sb-*), the legacy dev-login session, and the impersonation snapshot. Then
// send the user back to the login wall.
async function handleLogout(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  try {
    const supabase = await getSupabaseAuthServerClient();
    await supabase?.auth.signOut();
  } catch {
    // best-effort server sign out; cookies are cleared below regardless
  }

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete(cookie.name);
    }
  }
  response.cookies.delete(sessionCookieName);
  response.cookies.delete(impersonatorCookieName);
  response.cookies.delete(impersonationCookieName);

  return response;
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
