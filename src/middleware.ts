import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { protectNlsaRoute } from "./lib/supabase/nlsa-middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/demo/nlsa" || request.nextUrl.pathname.startsWith("/demo/nlsa/")) {
    return protectNlsaRoute(request);
  }
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data } = await supabase.auth.getUser();
  if (data.user) return response;
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/demo/nlsa/:path*"] };
