import { NextResponse } from "next/server";
import { recordSponsorClick } from "@/lib/services/sponsor-analytics";

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
    const payload = await request.json() as ClickPayload;
    const sponsorId = readOptionalString(payload.sponsorId);

    if (!sponsorId) {
      return NextResponse.json({ error: "Sponsor is required." }, { status: 400 });
    }

    await recordSponsorClick({
      sponsorId,
      fieldId: readOptionalString(payload.fieldId),
      sessionId: readOptionalString(payload.sessionId),
      pageType: readOptionalString(payload.pageType) ?? "field_page",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record sponsor click", error);
    return NextResponse.json({ error: "Unable to record sponsor click." }, { status: 500 });
  }
}
