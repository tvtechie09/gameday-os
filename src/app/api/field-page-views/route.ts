import { NextResponse } from "next/server";
import { recordFieldPageView } from "@/lib/services/field-page-views";
import { ApiRequestError, parseJsonObject, readBoundedString } from "@/lib/api-request";

type FieldPageViewPayload = {
  venueId?: unknown;
  fieldId?: unknown;
  sessionId?: unknown;
  pageType?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonObject<FieldPageViewPayload>(request);
    const venueId = readBoundedString(payload.venueId, 128);
    const fieldId = readBoundedString(payload.fieldId, 128);

    if (!venueId || !fieldId) {
      return NextResponse.json({ error: "Venue and field are required." }, { status: 400 });
    }

    await recordFieldPageView({
      venueId,
      fieldId,
      sessionId: readBoundedString(payload.sessionId, 128) || null,
      pageType: readBoundedString(payload.pageType, 64) || "field_page",
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to record field page view", error);
    return NextResponse.json({ error: "Unable to record field page view." }, { status: 500 });
  }
}
