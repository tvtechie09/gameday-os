import { NextResponse } from "next/server";
import { createFollow } from "@/lib/services/follows";
import type { FollowType } from "@/lib/types";
import { ApiRequestError, parseJsonObject, readBoundedString } from "@/lib/api-request";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type FollowPayload = {
  fieldId?: unknown;
  sessionId?: unknown;
  followType?: unknown;
  displayName?: unknown;
  notificationLevel?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readFollowType(value: unknown): FollowType {
  return value === "session" ? "session" : "field";
}

export async function POST(request: Request) {
  // Public, unauthenticated write: throttle floods per source IP. Generous
  // because a whole venue crowd follows from one shared WiFi IP.
  const limit = rateLimit(`follow:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  try {
    const payload = await parseJsonObject<FollowPayload>(request);
    const fieldId = readBoundedString(payload.fieldId, 128);
    const sessionId = readBoundedString(payload.sessionId, 128);
    const followType = readFollowType(payload.followType);

    if (!fieldId) {
      return NextResponse.json({ error: "Field is required." }, { status: 400 });
    }

    if (followType === "session" && !sessionId) {
      return NextResponse.json({ error: "Session is required to follow a game." }, { status: 400 });
    }

    const email = readBoundedString((payload as { email?: unknown }).email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required to receive updates." }, { status: 400 });
    }

    const follow = await createFollow({
      displayName: readBoundedString(payload.displayName, 120) || null,
      email,
      fieldId,
      followType,
      sessionId: followType === "session" ? sessionId : null,
      notificationLevel: payload.notificationLevel === "critical_only" ? "critical_only" : "all_updates",
    });

    return NextResponse.json({ manageUrl: `/follow/${follow.manageToken}`, ok: true });
  } catch (error) {
    if (error instanceof ApiRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to create follow", error);
    return NextResponse.json({ error: "Unable to follow right now." }, { status: 500 });
  }
}
