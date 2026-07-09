import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/auth-middleware";

// Minimal PKCE/code-exchange callback. Email+password sign-in does not use this,
// but it is required if a magic link, OAuth, or invite flow is ever enabled.
// Exchanges the auth code for a session, persists the cookies, then redirects.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);
  if (!supabase) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  // Carry the session cookies written during the exchange onto the redirect.
  const redirectResponse = NextResponse.redirect(new URL(next, origin));
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}
