import { NextResponse } from "next/server";
import { AutomationError, deleteAutomationWorkflow, enableAutomationWorkflow, pauseAutomationWorkflow, updateAutomationWorkflow, type AutomationWorkflowInput } from "@/lib/services/automation-workflows";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function automationApiError(error: unknown) {
  if (error instanceof VenueAuthError) return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  if (error instanceof AutomationError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  console.error("Automation API failure", error);
  return NextResponse.json({ error: "Automation request failed safely.", ok: false }, { status: 500 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    if (typeof payload === "object" && payload && "paused" in payload && Object.keys(payload).length === 1) {
      const actorUserId = await getVerifiedVenueActorId();
      const workflow = Boolean(payload.paused) ? await pauseAutomationWorkflow(id, actorUserId) : await enableAutomationWorkflow(id, actorUserId);
      return NextResponse.json({ ok: true, rule: workflow, workflow });
    }
    const workflow = await updateAutomationWorkflow(id, payload as AutomationWorkflowInput, await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true, rule: workflow, workflow });
  } catch (error) {
    return automationApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteAutomationWorkflow(id, await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return automationApiError(error);
  }
}
