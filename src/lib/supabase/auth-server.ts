import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Cookie-bound Supabase client for React Server Components and route handlers.
// Reads/writes the Supabase auth cookies via next/headers so auth.getUser()
// reflects the current signed-in user server-side. Returns null when Supabase
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
      setAll(cookiesToSet) {
        // In Server Components cookie writes are not allowed; ignore the
        // failure. Token refresh cookies are persisted by the middleware
        // client instead (see auth-middleware.ts).
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // no-op: read-only cookie context
        }
      },
    },
  });
}

// Resolve the authenticated Supabase user (verified server-side). Returns null
// when unconfigured or unauthenticated. Always uses auth.getUser() (contacts
// the auth server) rather than trusting the client-held session.
export async function getSupabaseAuthUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await getSupabaseAuthServerClient();
  if (!supabase) {
    return null;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  return { id: user.id, email: user.email ?? "" };
}
