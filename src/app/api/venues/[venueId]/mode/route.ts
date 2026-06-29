import { NextResponse } from "next/server";
import { getVenueModeData } from "@/lib/services/venue-mode";

type RouteContext = {
  params: Promise<{
    venueId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { venueId } = await context.params;

  try {
    const data = await getVenueModeData(venueId);

    if (!data) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode: "venue",
      providerIntegrations: {
        ciscoSpacesImplemented: false,
        merakiImplemented: false,
        note: "Venue Mode exposes provider-ready endpoint metadata only. Network/location providers are not implemented in v1.",
      },
      ...data,
    });
  } catch (error) {
    console.error("Failed to load Venue Mode data", error);
    return NextResponse.json({ error: "Unable to load Venue Mode data" }, { status: 500 });
  }
}
