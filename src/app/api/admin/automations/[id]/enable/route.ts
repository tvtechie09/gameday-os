import { NextResponse } from "next/server";
import { AutomationError, enableAutomationWorkflow } from "@/lib/services/automation-workflows";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function automationApiError(error: unknown) {
  if (error instanceof VenueAuthError) return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  if (error instanceof AutomationError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  console.error("Automation enable API failure", error);
  return NextResponse.json({ error: "Automation enable failed safely.", ok: false }, { status: 500 });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workflow = await enableAutomationWorkflow(id, await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    return automationApiError(error);
  }
}
