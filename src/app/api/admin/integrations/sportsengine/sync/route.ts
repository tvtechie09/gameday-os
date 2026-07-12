import { NextResponse } from "next/server";
import { syncSportsEngineSchedule } from "@/lib/services/sportsengine-integration";
import { getActorUserId, sportsEngineApiError } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const summary = await syncSportsEngineSchedule(String(body.connectionId ?? ""), await getActorUserId());
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return sportsEngineApiError(error);
  }
}
