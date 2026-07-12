import { NextResponse } from "next/server";
import { recordSponsorImpressions } from "@/lib/services/sponsor-analytics";
import { ApiRequestError, parseJsonObject, readBoundedString } from "@/lib/api-request";

type ImpressionPayload = {
  sponsorIds?: unknown;
  fieldId?: unknown;
  sessionId?: unknown;
  pageType?: unknown;
};

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonObject<ImpressionPayload>(request);
    const sponsorIds = Array.isArray(payload.sponsorIds)
      ? [...new Set(payload.sponsorIds.map((value) => readBoundedString(value, 128)).filter(Boolean))].slice(0, 50)
      : [];

    if (sponsorIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    await recordSponsorImpressions(sponsorIds.map((sponsorId) => ({
      sponsorId,
      fieldId: readBoundedString(payload.fieldId, 128) || null,
      sessionId: readBoundedString(payload.sessionId, 128) || null,
      pageType: readBoundedString(payload.pageType, 64) || "field_page",
    })));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to record sponsor impressions", error);
    return NextResponse.json({ error: "Unable to record sponsor impressions." }, { status: 500 });
  }
}
