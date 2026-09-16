import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { needsMfaChallenge } from "@/lib/access/mfa-core";
import type { Database } from "@/lib/supabase/types";

type LoginBody = { email?: unknown; password?: unknown };

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid sign-in request." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Authentication is not configured for this environment." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16_384) {
    return NextResponse.json({ error: "Invalid sign-in request." }, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as LoginBody | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || email.length > 320 || password.length > 1024) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const responseHeaders: Record<string, string> = {};
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookiesToSet.push(...cookies);
        Object.assign(responseHeaders, headers);
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  let mfaFactorId = "";
  if (needsMfaChallenge(aal?.currentLevel ?? null, aal?.nextLevel ?? null)) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    mfaFactorId = factors?.totp?.find((factor) => factor.status === "verified")?.id ?? "";
  }

  const response = NextResponse.json({ ok: true, mfaFactorId: mfaFactorId || null });
  for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
  for (const [name, value] of Object.entries(responseHeaders)) response.headers.set(name, value);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
