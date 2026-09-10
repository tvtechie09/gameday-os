import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/access/session";
import { searchVenue } from "@/lib/services/universal-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "cache-control": "no-store" } });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!query) return NextResponse.json({ results: [] }, { headers: { "cache-control": "no-store" } });
  try {
    return NextResponse.json({ results: await searchVenue(ctx, query) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Search is temporarily unavailable. Try again." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
