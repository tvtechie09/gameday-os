import { NextResponse } from "next/server";
import { normalizeProviderKey, validateScoreboardDeviceToken } from "@/lib/scoreboard-adapter-core";
import { ingestScoreboardReading, type ScoreboardReadingPayload } from "@/lib/services/daktronics-scoreboard";

export const dynamic = "force-dynamic";

function token(request: Request) {
  const explicit = request.headers.get("x-gameday-adapter-token");
  if (explicit) return explicit;
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : null;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ScoreboardReadingPayload;
    const provider = normalizeProviderKey(request.headers.get("x-gameday-scoreboard-provider") ?? payload.provider);
    const deviceKey = payload.deviceId?.trim() || payload.adapterKey?.trim() || "";
    if (!provider || !deviceKey) {
      return NextResponse.json({ error: "A supported provider and provisioned device key are required.", ok: false }, { status: 400 });
    }
    if (!validateScoreboardDeviceToken(token(request), { deviceKey, provider })) {
      return NextResponse.json({ error: "Valid device-scoped scoreboard credentials are required.", ok: false }, { status: 401 });
    }
    const result = await ingestScoreboardReading(provider, payload, {
      adapterHost: request.headers.get("x-gameday-adapter-host"),
      adapterVersion: request.headers.get("x-gameday-adapter-version"),
    });
    return NextResponse.json({ duplicate: result.duplicate, events: result.events, ok: true, reading: result.reading });
  } catch (error) {
    console.error("Scoreboard reading ingestion failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scoreboard reading ingestion failed.", ok: false }, { status: 400 });
  }
}
