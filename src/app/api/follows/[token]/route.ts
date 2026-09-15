import { NextResponse } from "next/server";
import { ApiRequestError, parseJsonObject } from "@/lib/api-request";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getFollowPreferences, updateFollowPreferences } from "@/lib/services/follows";

type RouteProps = { params: Promise<{ token: string }> };

function readToken(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : "";
}

export async function GET(request: Request, { params }: RouteProps) {
  const limit = rateLimit(`follow-manage-read:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const token = readToken((await params).token);
  if (!token) return NextResponse.json({ error: "Follow link is invalid." }, { status: 400 });

  const preferences = await getFollowPreferences(token);
  return preferences
    ? NextResponse.json({ preferences })
    : NextResponse.json({ error: "Follow link was not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const limit = rateLimit(`follow-manage-write:${clientIp(request)}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  try {
    const token = readToken((await params).token);
    if (!token) return NextResponse.json({ error: "Follow link is invalid." }, { status: 400 });

    const payload = await parseJsonObject<{ emailEnabled?: unknown; notificationLevel?: unknown }>(request);
    if (typeof payload.emailEnabled !== "boolean") {
      return NextResponse.json({ error: "Email preference is required." }, { status: 400 });
    }

    const preferences = await updateFollowPreferences(token, {
      emailEnabled: payload.emailEnabled,
      notificationLevel: payload.notificationLevel === "critical_only" ? "critical_only" : "all_updates",
    });

    return preferences
      ? NextResponse.json({ ok: true, preferences })
      : NextResponse.json({ error: "Follow link was not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof ApiRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to update follow preferences", error);
    return NextResponse.json({ error: "Unable to update preferences right now." }, { status: 500 });
  }
}
