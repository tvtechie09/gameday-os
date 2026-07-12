import { NextResponse } from "next/server";
import { connectSportsEngine } from "@/lib/services/sportsengine-integration";
import { getActorUserId, sportsEngineApiError } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const connection = await connectSportsEngine({
      externalOrgId: String(body.externalOrgId ?? "se-demo-org"),
      notes: typeof body.notes === "string" ? body.notes : null,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : null,
      sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : null,
      venueId: String(body.venueId ?? ""),
    }, await getActorUserId());
    return NextResponse.json({ connection, ok: true }, { status: 201 });
  } catch (error) {
    return sportsEngineApiError(error);
  }
}
