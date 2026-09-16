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
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        // Apply the complete cookie generation atomically. Supabase may remove
        // stale chunks while writing a refreshed session; dropping those
        // removals can leave the browser with a mixed, unreadable token.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
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
