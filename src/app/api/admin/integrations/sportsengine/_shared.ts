import { NextResponse } from "next/server";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export async function getActorUserId() {
  return getVerifiedVenueActorId();
}

export function sportsEngineApiError(error: unknown) {
  if (error instanceof VenueAuthError) return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  if (error instanceof PermissionDeniedError) {
    return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  }
  console.error("SportsEngine integration API failure", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "SportsEngine request failed safely.", ok: false }, { status: 500 });
}
