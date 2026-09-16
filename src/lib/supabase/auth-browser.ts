"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

// Cookie-based browser Supabase client for the login form. Uses @supabase/ssr
// so the session is stored in cookies the server middleware can read. Returns
// null when Supabase env is not configured.
export function getSupabaseAuthBrowserClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  client ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
