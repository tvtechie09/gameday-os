import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Cookie-bound Supabase client for React Server Components and route handlers.
// Reads/writes the Supabase auth cookies via next/headers so verified claims
// reflect the current signed-in user server-side. Returns null when Supabase
// env is not configured so the app still builds/runs without credentials.
export async function getSupabaseAuthServerClient(): Promise<SupabaseClient<Database> | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      encode: "tokens-only",
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // React Server Components are a read-only cookie context. Never begin
        // a multi-cookie write here: a partial write can corrupt a chunked
        // session before Next rejects the mutation. Middleware is the single
        // owner of refresh-cookie persistence (see auth-middleware.ts).
      },
    },
  });
}

// Resolve the authenticated Supabase user from verified JWT claims. The proxy
// refreshes the token before Server Components run; validating those claims
// here avoids a second auth-network call that can try to rotate cookies from a
// read-only Server Component response.
export async function getSupabaseAuthUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await getSupabaseAuthServerClient();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  const email = data?.claims.email;
  if (typeof id !== "string" || typeof email !== "string") {
    return null;
  }
  return { id, email };
}
