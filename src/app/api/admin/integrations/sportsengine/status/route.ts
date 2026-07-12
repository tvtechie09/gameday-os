import { NextResponse } from "next/server";
import { getSportsEngineStatus } from "@/lib/services/sportsengine-integration";
import { getActorUserId, sportsEngineApiError } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const connections = await getSportsEngineStatus(await getActorUserId());
    return NextResponse.json({ connections, ok: true });
  } catch (error) {
    return sportsEngineApiError(error);
  }
}
