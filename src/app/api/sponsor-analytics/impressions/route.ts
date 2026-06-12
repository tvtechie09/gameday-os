import { NextResponse } from "next/server";
import { recordSponsorImpressions } from "@/lib/services/sponsor-analytics";

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
    const payload = await request.json() as ImpressionPayload;
    const sponsorIds = Array.isArray(payload.sponsorIds)
      ? [...new Set(payload.sponsorIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0))]
      : [];

    if (sponsorIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    await recordSponsorImpressions(sponsorIds.map((sponsorId) => ({
      sponsorId,
      fieldId: readOptionalString(payload.fieldId),
      sessionId: readOptionalString(payload.sessionId),
      pageType: readOptionalString(payload.pageType) ?? "field_page",
    })));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record sponsor impressions", error);
    return NextResponse.json({ error: "Unable to record sponsor impressions." }, { status: 500 });
  }
}
