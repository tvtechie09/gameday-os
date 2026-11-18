import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next({ request });
  // AppFrame performs the capability decision with the fully resolved server
  // session. Always replace this header so a caller cannot spoof another path.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-gameday-admin-path", request.nextUrl.pathname);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request: { headers: requestHeaders } });
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data } = await supabase.auth.getUser();
  if (data.user) return response;
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
