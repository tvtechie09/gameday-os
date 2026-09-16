import { NextResponse } from "next/server";
import { applyScorekeeperState, openScorekeeperSession, type ScorekeeperState } from "@/lib/services/scorekeeper";
import { clientIp, isBlocked, recordFailure } from "@/lib/rate-limit";
import { checkDurableFailureLimit, durableLimitKey } from "@/lib/durable-rate-limit";

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
    // Brute-force protection for the 4-digit PIN (10k combinations). We count
    // only FAILED attempts, so a legitimate scorekeeper tapping the pad (each
    // tap is a correct-PIN sync) is never throttled. Keyed per game token (a
    // distributed attack on one game) and per IP (one source spraying games).
    const ip = clientIp(request);
    const durableTokenKey = durableLimitKey("score-token", token);
    const durableIpKey = durableLimitKey("score-ip", ip);
    const [durableTokenBlock, durableIpBlock] = await Promise.all([
      checkDurableFailureLimit(durableTokenKey, 10, 60),
      checkDurableFailureLimit(durableIpKey, 25, 60),
    ]);
    const tokenBlock = isBlocked("score-token:" + token);
    const ipBlock = isBlocked("score-ip:" + ip);
    if (durableTokenBlock.blocked || durableIpBlock.blocked || tokenBlock.blocked || ipBlock.blocked) {
      return NextResponse.json({ error: "Too many incorrect attempts. Wait a moment and try again." }, { status: 429, headers: { "cache-control": "no-store", "retry-after": String(Math.max(durableTokenBlock.retryAfter, durableIpBlock.retryAfter, tokenBlock.retryAfter, ipBlock.retryAfter)) } });
    }
    const payload = (await request.json().catch(() => ({}))) as ScorePayload;
    const pin = typeof payload.pin === "string" ? payload.pin.trim() : "";
    if (!/^\d{4}$/.test(pin)) {
      recordFailure("score-token:" + token, 10, 60_000);
      recordFailure("score-ip:" + ip, 25, 60_000);
      await Promise.all([
        checkDurableFailureLimit(durableTokenKey, 10, 60, true),
        checkDurableFailureLimit(durableIpKey, 25, 60, true),
      ]);
      return NextResponse.json({ error: "Enter the 4-digit game PIN." }, { status: 401, headers: { "cache-control": "no-store" } });
    }
    const failWrongPin = async () => {
      recordFailure("score-token:" + token, 10, 60_000);
      recordFailure("score-ip:" + ip, 25, 60_000);
      await Promise.all([
        checkDurableFailureLimit(durableTokenKey, 10, 60, true),
        checkDurableFailureLimit(durableIpKey, 25, 60, true),
      ]);
      return NextResponse.json({ error: "Wrong PIN or this scorekeeper link is no longer active." }, { status: 401, headers: { "cache-control": "no-store" } });
    };
    if (payload.action === "sync") {
      const seq = Number(payload.seq);
      const view = await applyScorekeeperState(token, pin, seq, payload.state ?? {});
      if (!view) return await failWrongPin();
      return NextResponse.json({ ok: true, game: view }, { headers: { "cache-control": "no-store" } });
    }
    const view = await openScorekeeperSession(token, pin);
    if (!view) return await failWrongPin();
    return NextResponse.json({ ok: true, game: view }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Scorekeeper request failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
