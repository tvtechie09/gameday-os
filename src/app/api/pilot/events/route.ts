import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/access/session";
import { isPilotEventName, sanitizePilotContext } from "@/lib/pilot-telemetry-core";
import { recordPilotEvent } from "@/lib/services/pilot-telemetry";

export async function POST(request: Request) {
  try {
    const session = await resolveSession();
    if (session.kind !== "active") return NextResponse.json({ accepted: false }, { status: 401 });
    const payload = await request.json().catch(() => null) as { eventName?: unknown; context?: unknown } | null;
    if (!isPilotEventName(payload?.eventName)) return NextResponse.json({ accepted: false }, { status: 400 });
    await recordPilotEvent(session.context, payload.eventName, sanitizePilotContext(payload?.context));
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch {
    // Telemetry is deliberately best-effort and never returns internal errors.
    return NextResponse.json({ accepted: false }, { status: 202 });
  }
}
