import { NextResponse } from "next/server";
import { getIntegrationProviderStatus } from "@/lib/services/integration-framework";
import { getActorUserId, integrationApiError, type ProviderRouteContext } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProviderRouteContext) {
  try {
    const { provider } = await context.params;
    const status = await getIntegrationProviderStatus(provider, await getActorUserId());
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return integrationApiError(error);
  }
}
