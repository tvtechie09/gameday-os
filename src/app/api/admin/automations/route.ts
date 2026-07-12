import { NextResponse } from "next/server";
import { AutomationError, createAutomationWorkflow, getAutomationMarketplace, type AutomationWorkflowInput } from "@/lib/services/automation-workflows";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export function automationApiError(error: unknown, fallback = "Automation request failed safely.") {
  if (error instanceof VenueAuthError) {
    return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  }
  if (error instanceof PermissionDeniedError) {
    return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  }
  if (error instanceof AutomationError) {
    return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  }

  console.error("Automation API failure", error);
  return NextResponse.json({ error: fallback, ok: false }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { templates, workflows } = await getAutomationMarketplace(await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true, rules: workflows, templates, workflows });
  } catch (error) {
    return automationApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AutomationWorkflowInput;
    const workflow = await createAutomationWorkflow(payload, await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true, rule: workflow, workflow }, { status: 201 });
  } catch (error) {
    return automationApiError(error);
  }
}
