import { NextResponse } from "next/server";
import { upsertSportsEngineFieldMapping } from "@/lib/services/sportsengine-integration";
import { getActorUserId, sportsEngineApiError } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mapping = await upsertSportsEngineFieldMapping({
      connectionId: String(body.connectionId ?? ""),
      externalFieldId: String(body.externalFieldId ?? ""),
      externalFieldName: String(body.externalFieldName ?? ""),
      externalVenueId: typeof body.externalVenueId === "string" ? body.externalVenueId : null,
      fieldId: String(body.fieldId ?? ""),
      organizationId: typeof body.organizationId === "string" ? body.organizationId : null,
      venueId: typeof body.venueId === "string" ? body.venueId : null,
    }, await getActorUserId());
    return NextResponse.json({ mapping, ok: true });
  } catch (error) {
    return sportsEngineApiError(error);
  }
}
