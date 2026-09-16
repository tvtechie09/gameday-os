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

// Resolve the authenticated user from cryptographically verified JWT claims.
// Middleware has already refreshed and remotely verified the session before
// Server Components run; validating its claims here avoids a second Auth
// network call from a read-only cookie context.
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
