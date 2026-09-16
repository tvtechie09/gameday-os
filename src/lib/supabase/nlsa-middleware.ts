import { NextResponse, type NextRequest } from "next/server";
import { isDevLoginEnabled } from "@/lib/access/env";
import { decodeSession, sessionCookieName } from "@/lib/access/session-cookie";
import { createSupabaseMiddlewareClient } from "./auth-middleware";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name, value }) => name.includes("-auth-token") && value.length > 0);
}

// The root middleware is the runtime entry point selected by Next.js. Keep
// this guard deliberately scoped to the private NLSA demo so the hardened
// Supabase refresh path cannot silently expand the legacy middleware matcher.
export async function protectNlsaRoute(request: NextRequest) {
  const devLogin = isDevLoginEnabled();
  const devPayload = devLogin ? await decodeSession(request.cookies.get(sessionCookieName)?.value) : null;
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request, {
    preserveAuthCookiesOnDeletionOnly: true,
  });

  let authedUser: { id: string } | null = null;
  if (supabase && hasSupabaseAuthCookie(request)) {
    const { data } = await supabase.auth.getUser();
    authedUser = data.user ? { id: data.user.id } : null;
  }

  const response = getResponse();
  response.headers.set("Cache-Control", "private, no-store");
  if (devPayload || authedUser) return response;

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
