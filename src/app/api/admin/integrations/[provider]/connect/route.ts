import { NextResponse } from "next/server";
import { createIntegrationConnection } from "@/lib/services/integration-framework";
import type { IntegrationProviderKey } from "@/lib/integration-framework";
import { getActorUserId, integrationApiError, type ProviderRouteContext } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: ProviderRouteContext) {
  try {
    const { provider } = await context.params;
    const body = await request.json();
    const connection = await createIntegrationConnection({
      externalAccountId: typeof body.externalAccountId === "string" ? body.externalAccountId : null,
      externalAccountName: typeof body.externalAccountName === "string" ? body.externalAccountName : null,
      externalOrgId: typeof body.externalOrgId === "string" ? body.externalOrgId : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : null,
      providerKey: provider as IntegrationProviderKey,
      sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : null,
      tournamentId: typeof body.tournamentId === "string" ? body.tournamentId : null,
      venueId: typeof body.venueId === "string" ? body.venueId : null,
    }, await getActorUserId());
    return NextResponse.json({ connection, ok: true }, { status: 201 });
  } catch (error) {
    return integrationApiError(error);
  }
}
