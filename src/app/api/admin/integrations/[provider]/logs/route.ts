import { NextResponse } from "next/server";
import { getIntegrationLogs } from "@/lib/services/integration-framework";
import { getActorUserId, integrationApiError, type ProviderRouteContext } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProviderRouteContext) {
  try {
    const { provider } = await context.params;
    const logs = await getIntegrationLogs(provider, await getActorUserId());
    return NextResponse.json({ logs, ok: true });
  } catch (error) {
    return integrationApiError(error);
  }
}
