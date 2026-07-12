import { NextResponse } from "next/server";
import { ingestDaktronicsReading, validateDaktronicsAdapterToken, type DaktronicsReadingPayload } from "@/lib/services/daktronics-scoreboard";

export const dynamic = "force-dynamic";

function getAdapterToken(request: Request) {
  const explicit = request.headers.get("x-gameday-adapter-token");
  if (explicit) return explicit;
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : null;
}

export async function POST(request: Request) {
  if (!validateDaktronicsAdapterToken(getAdapterToken(request))) {
    return NextResponse.json({ error: "Valid Daktronics adapter token is required.", ok: false }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as DaktronicsReadingPayload;
    const result = await ingestDaktronicsReading(payload, {
      adapterHost: request.headers.get("x-gameday-adapter-host"),
      adapterVersion: request.headers.get("x-gameday-adapter-version"),
    });
    return NextResponse.json({ duplicate: result.duplicate, events: result.events, ok: true, reading: result.reading });
  } catch (error) {
    console.error("Daktronics reading ingestion failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Daktronics reading ingestion failed.", ok: false }, { status: 400 });
  }
}
