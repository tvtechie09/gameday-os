import { NextResponse } from "next/server";
import { getSportsEngineEvents, getSportsEngineFieldMappings, getSportsEngineSyncLogs } from "@/lib/services/sportsengine-integration";
import { getActorUserId, sportsEngineApiError } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const connectionId = new URL(request.url).searchParams.get("connectionId") ?? "";
    const actorUserId = await getActorUserId();
    const [events, fieldMappings, logs] = await Promise.all([
      getSportsEngineEvents(connectionId, actorUserId),
      getSportsEngineFieldMappings(connectionId, actorUserId),
      getSportsEngineSyncLogs(connectionId, actorUserId),
    ]);
    return NextResponse.json({ events, fieldMappings, logs, ok: true });
  } catch (error) {
    return sportsEngineApiError(error);
  }
}
