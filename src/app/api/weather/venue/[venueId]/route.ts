import { NextResponse } from "next/server";
import { getLiveWeatherForVenue, LiveWeatherError } from "@/lib/services/weather-live";

type WeatherRouteParams = {
  params: Promise<{ venueId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: WeatherRouteParams) {
  const { venueId } = await params;

  try {
    const weather = await getLiveWeatherForVenue(venueId);
    return NextResponse.json({ ok: true, weather }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof LiveWeatherError) {
      return NextResponse.json({ code: error.code, error: error.message, ok: false }, { status: error.status });
    }

    console.error("Unexpected weather API failure", error);
    return NextResponse.json({ code: "provider_failure", error: "Unable to load weather data.", ok: false }, { status: 500 });
  }
}
