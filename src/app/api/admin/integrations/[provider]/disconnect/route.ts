import { NextResponse } from "next/server";
import { disconnectIntegration } from "@/lib/services/integration-framework";
import { getActorUserId, integrationApiError, type ProviderRouteContext } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: ProviderRouteContext) {
  try {
    const { provider } = await context.params;
    const connection = await disconnectIntegration(provider, await getActorUserId());
    return NextResponse.json({ connection, ok: true });
  } catch (error) {
    return integrationApiError(error);
  }
}
