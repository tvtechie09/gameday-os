import { NextResponse } from "next/server";
import { buildPersonPrivacyScope, PrivacyAuthorizationError } from "@/lib/services/privacy-controls";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const payload = await buildPersonPrivacyScope(url.searchParams.get("personId") ?? "", url.searchParams.get("organizationId") ?? "");
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": "attachment; filename=\"gameday-person-export.json\"", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const status = error instanceof PrivacyAuthorizationError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "Privacy scope not available." : "Privacy export temporarily unavailable." }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
