import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export class VenueAuthError extends Error {
  constructor(message = "Sign in is required.") { super(message); this.name = "VenueAuthError"; }
}

export async function getVerifiedVenueActorId() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new VenueAuthError("Supabase authentication is not configured.");
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined } });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new VenueAuthError();
  const admin = getSupabaseAdminClient();
  const { data: internalUser, error: userError } = await admin.from("users").select("id,user_status").eq("auth_user_id", data.user.id).maybeSingle();
  if (userError || !internalUser || internalUser.user_status !== "active") throw new VenueAuthError("Your Venue OS account is not active.");
  return internalUser.id;
}
