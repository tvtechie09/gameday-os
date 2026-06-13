import { NextResponse } from "next/server";
import { createFollow } from "@/lib/services/follows";
import type { FollowType } from "@/lib/types";

type FollowPayload = {
  fieldId?: unknown;
  sessionId?: unknown;
  followType?: unknown;
  displayName?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readFollowType(value: unknown): FollowType {
  return value === "session" ? "session" : "field";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as FollowPayload;
    const fieldId = readString(payload.fieldId);
    const sessionId = readString(payload.sessionId);
    const followType = readFollowType(payload.followType);

    if (!fieldId) {
      return NextResponse.json({ error: "Field is required." }, { status: 400 });
    }

    if (followType === "session" && !sessionId) {
      return NextResponse.json({ error: "Session is required to follow a game." }, { status: 400 });
    }

    await createFollow({
      displayName: readString(payload.displayName) || null,
      fieldId,
      followType,
      sessionId: followType === "session" ? sessionId : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to create follow", error);
    return NextResponse.json({ error: "Unable to follow right now." }, { status: 500 });
  }
}
