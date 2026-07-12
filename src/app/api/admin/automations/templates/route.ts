import { NextResponse } from "next/server";
import { AutomationError, getAutomationMarketplace } from "@/lib/services/automation-workflows";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

function templateApiError(error: unknown) {
  if (error instanceof VenueAuthError) return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  if (error instanceof AutomationError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  console.error("Automation template API failure", error);
  return NextResponse.json({ error: "Automation template request failed safely.", ok: false }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const marketplace = await getAutomationMarketplace(await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true, ...marketplace });
  } catch (error) {
    return templateApiError(error);
  }
}
