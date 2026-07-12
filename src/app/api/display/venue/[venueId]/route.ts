import { NextResponse } from "next/server";
import { getVenueDisplayPayload } from "@/lib/services/venue-display";

type VenueDisplayApiProps = {
  params: Promise<{
    venueId: string;
  }>;
};

export async function GET(_request: Request, { params }: VenueDisplayApiProps) {
  try {
    const { venueId } = await params;
    const payload = await getVenueDisplayPayload(venueId);
    return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Failed to load venue display payload", error);
    return NextResponse.json({ error: "Unable to load venue display." }, { status: 500 });
  }
}
