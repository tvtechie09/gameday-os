import { NextResponse } from "next/server";
import { AutomationError, installAutomationTemplate, type InstallAutomationTemplateInput } from "@/lib/services/automation-workflows";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVerifiedVenueActorId, VenueAuthError } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

function installApiError(error: unknown) {
  if (error instanceof VenueAuthError) return NextResponse.json({ error: error.message, ok: false }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  if (error instanceof AutomationError) return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
  console.error("Automation template install failure", error);
  return NextResponse.json({ error: "Automation template install failed safely.", ok: false }, { status: 500 });
}

export async function POST(request: Request, context: { params: Promise<{ templateKey: string }> }) {
  try {
    const { templateKey } = await context.params;
    const payload = (await request.json()) as InstallAutomationTemplateInput;
    const workflow = await installAutomationTemplate(templateKey, payload, await getVerifiedVenueActorId());
    return NextResponse.json({ ok: true, workflow }, { status: 201 });
  } catch (error) {
    return installApiError(error);
  }
}
