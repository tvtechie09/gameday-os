import { NextResponse } from "next/server";
import { applyScorekeeperState, openScorekeeperSession, type ScorekeeperState } from "@/lib/services/scorekeeper";

export const dynamic = "force-dynamic";

type ScorePayload = {
  pin?: unknown;
  action?: unknown;
  seq?: unknown;
  state?: Partial<ScorekeeperState>;
};

// Public, token+PIN gated scorekeeper endpoint. No cookies, no accounts —
// the token is unguessable and the PIN stops shoulder-surfed URLs.
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    if (!token || token.length > 64) {
      return NextResponse.json({ error: "Invalid scorekeeper link." }, { status: 400, headers: { "cache-control": "no-store" } });
    }
    const payload = (await request.json().catch(() => ({}))) as ScorePayload;
    const pin = typeof payload.pin === "string" ? payload.pin.trim() : "";
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "Enter the 4-digit game PIN." }, { status: 401, headers: { "cache-control": "no-store" } });
    }
    if (payload.action === "sync") {
      const seq = Number(payload.seq);
      const view = await applyScorekeeperState(token, pin, seq, payload.state ?? {});
      if (!view) return NextResponse.json({ error: "Wrong PIN or this scorekeeper link is no longer active." }, { status: 401, headers: { "cache-control": "no-store" } });
      return NextResponse.json({ ok: true, game: view }, { headers: { "cache-control": "no-store" } });
    }
    const view = await openScorekeeperSession(token, pin);
    if (!view) return NextResponse.json({ error: "Wrong PIN or this scorekeeper link is no longer active." }, { status: 401, headers: { "cache-control": "no-store" } });
    return NextResponse.json({ ok: true, game: view }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Scorekeeper request failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
