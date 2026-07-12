import { NextResponse } from "next/server";
import { runIntegrationSync } from "@/lib/services/integration-framework";
import { getActorUserId, integrationApiError, type ProviderRouteContext } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: ProviderRouteContext) {
  try {
    const { provider } = await context.params;
    const body = await request.json().catch(() => ({}));
    const run = await runIntegrationSync(provider, await getActorUserId(), typeof body.idempotencyKey === "string" ? body.idempotencyKey : null);
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return integrationApiError(error);
  }
}
