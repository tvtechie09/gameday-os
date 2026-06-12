import { NextResponse } from "next/server";
import { recordFieldPageView } from "@/lib/services/field-page-views";

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
    const payload = await request.json() as FieldPageViewPayload;
    const venueId = readString(payload.venueId);
    const fieldId = readString(payload.fieldId);

    if (!venueId || !fieldId) {
      return NextResponse.json({ error: "Venue and field are required." }, { status: 400 });
    }

    await recordFieldPageView({
      venueId,
      fieldId,
      sessionId: readString(payload.sessionId) || null,
      pageType: readString(payload.pageType) || "field_page",
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record field page view", error);
    return NextResponse.json({ error: "Unable to record field page view." }, { status: 500 });
  }
}
