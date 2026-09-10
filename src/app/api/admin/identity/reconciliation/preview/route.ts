import { NextResponse } from "next/server";
import { LegacyReconciliationAuthorizationError, previewLegacyIdentityReconciliation } from "@/lib/services/legacy-identity-reconciliation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const manifest = await previewLegacyIdentityReconciliation(url.searchParams.get("stateId") ?? "", Number(url.searchParams.get("page") ?? "1"));
    return NextResponse.json(manifest, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": "attachment; filename=\"gameday-legacy-reconciliation-preview.json\"", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const status = error instanceof LegacyReconciliationAuthorizationError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "Preview not available." : "Preview temporarily unavailable." }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
