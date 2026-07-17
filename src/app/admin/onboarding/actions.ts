"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManagePlatform, isPlatformAdmin } from "@/lib/access/capabilities";
import { provisionVenue } from "@/lib/services/provisioning";

function dollarsToCents(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function provisionVenueAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  // Sales-led by design: only GameDay staff onboard a customer.
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) {
    redirect("/admin/onboarding?error=" + encodeURIComponent("Only GameDay platform staff can onboard a venue."));
  }

  const amount = String(formData.get("plan_amount") ?? "").trim();
  const planLabel = String(formData.get("plan_label") ?? "").trim();

  let result;
  try {
    result = await provisionVenue({
      organizationName: String(formData.get("organization_name") ?? ""),
      venueName: String(formData.get("venue_name") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      fieldCount: Number(formData.get("field_count") ?? 0),
      fieldNamePattern: String(formData.get("field_pattern") ?? "Field {n}"),
      sportType: String(formData.get("sport_type") ?? "baseball"),
      plan: amount ? { label: planLabel || "Custom", amountCents: dollarsToCents(amount), interval: String(formData.get("plan_interval") ?? "month") === "year" ? "year" : "month" } : null,
    }, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not onboard the venue.";
    redirect("/admin/onboarding?error=" + encodeURIComponent(message));
  }

  revalidatePath("/admin/onboarding");
  revalidatePath("/admin/venues");
  redirect(
    "/admin/onboarding?done=1"
    + "&venue=" + encodeURIComponent(result.venueId)
    + "&name=" + encodeURIComponent(result.venueName)
    + "&fields=" + String(result.fieldIds.length)
    + "&plan=" + (result.planApplied ? "1" : "0")
  );
}
