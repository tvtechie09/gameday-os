import { NextResponse } from "next/server";
import { recordSponsorClick } from "@/lib/services/sponsor-analytics";
import { ApiRequestError, parseJsonObject, readBoundedString } from "@/lib/api-request";

type ClickPayload = {
  sponsorId?: unknown;
  fieldId?: unknown;
  sessionId?: unknown;
  pageType?: unknown;
};

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonObject<ClickPayload>(request);
    const sponsorId = readBoundedString(payload.sponsorId, 128) || null;

    if (!sponsorId) {
      return NextResponse.json({ error: "Sponsor is required." }, { status: 400 });
    }

    await recordSponsorClick({
      sponsorId,
      fieldId: readBoundedString(payload.fieldId, 128) || null,
      sessionId: readBoundedString(payload.sessionId, 128) || null,
      pageType: readBoundedString(payload.pageType, 64) || "field_page",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to record sponsor click", error);
    return NextResponse.json({ error: "Unable to record sponsor click." }, { status: 500 });
  }
}
