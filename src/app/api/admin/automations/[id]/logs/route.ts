import { NextResponse } from "next/server";
import { AutomationError, getAutomationRunLogs } from "@/lib/services/automation-workflows";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function automationApiError(error: unknown) {
  if (error instanceof VenueAuthError) return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  if (error instanceof AutomationError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  console.error("Automation API failure", error);
  return NextResponse.json({ error: "Automation logs failed safely.", ok: false }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const logs = await getAutomationRunLogs(id, await getVerifiedVenueActorId());
    return NextResponse.json({ logs, ok: true });
  } catch (error) {
    return automationApiError(error);
  }
}
