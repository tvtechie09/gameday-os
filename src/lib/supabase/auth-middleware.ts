import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Middleware Supabase client. Binds cookie reads to the incoming request and
// cookie writes to a mutable NextResponse so refreshed auth tokens are
// persisted on every request. Returns { supabase, response } — callers must
// return (a copy of) `response` for cookies to be sent.
export function createSupabaseMiddlewareClient(request: NextRequest): {
  supabase: SupabaseClient<Database> | null;
  getResponse: () => NextResponse;
} {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabase: null, getResponse: () => response };
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      encode: "tokens-only",
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        // Auth validation must not turn a successful request into a logout.
        // Explicit sign-out owns cookie deletion; middleware only forwards
        // non-empty session writes (for example, a genuine token refresh).
        const sessionWrites = cookiesToSet.filter(
          ({ value, options }) => value.length > 0 && options.maxAge !== 0,
        );
        for (const { name, value } of sessionWrites) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of sessionWrites) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headersToSet)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  // `setAll` may replace `response` after a token refresh so it can carry the
  // mutated request cookies forward to Server Components. Expose a getter
  // instead of returning the initial response by value; otherwise callers can
  // accidentally discard the refreshed cookies on the very next navigation.
  return { supabase, getResponse: () => response };
}
