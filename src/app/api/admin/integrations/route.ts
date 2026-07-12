import { NextResponse } from "next/server";
import { getIntegrationSummaries } from "@/lib/services/integration-framework";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

function apiError(error: unknown) {
  if (error instanceof VenueAuthError) return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  console.error("Integration Framework API failure", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Integration request failed safely.", ok: false }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const providers = await getIntegrationSummaries(await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true, providers });
  } catch (error) {
    return apiError(error);
  }
}
