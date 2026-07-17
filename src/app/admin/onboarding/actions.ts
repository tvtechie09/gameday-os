"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManagePlatform, isPlatformAdmin } from "@/lib/access/capabilities";
import { packageByKey, provisionVenue, teardownDemoTenant, type AccountType, type PackageKey } from "@/lib/services/provisioning";

function dollarsToCents(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function checked(formData: FormData, name: string): boolean {
  return String(formData.get(name) ?? "") === "on";
}

export async function provisionVenueAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  // Sales-led by design: only GameDay staff onboard a customer.
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) {
    redirect("/admin/onboarding?error=" + encodeURIComponent("Only GameDay platform staff can onboard a venue."));
  }

  const amount = String(formData.get("plan_amount") ?? "").trim();
  const packageKey = String(formData.get("package_key") ?? "complex") as PackageKey;
  const accountType: AccountType = String(formData.get("account_type") ?? "complex") === "organization" ? "organization" : "complex";
  // Plan label defaults to the chosen package so billing reads the same language
  // as the sale, instead of whatever someone typed.
  const planLabel = String(formData.get("plan_label") ?? "").trim() || packageByKey(packageKey)?.label || "Custom";

  let result;
  try {
    result = await provisionVenue({
      accountType,
      organizationName: String(formData.get("organization_name") ?? ""),
      venueName: String(formData.get("venue_name") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      fieldCount: Number(formData.get("field_count") ?? 0),
      fieldNamePattern: String(formData.get("field_pattern") ?? "Field {n}"),
      splitsPerField: Number(formData.get("splits_per_field") ?? 0),
      sportType: String(formData.get("sport_type") ?? "baseball"),
      technology: {
        scoreboards: checked(formData, "tech_scoreboards"),
        cameras: checked(formData, "tech_cameras"),
        audio: checked(formData, "tech_audio"),
      },
      league: accountType === "organization"
        ? {
            leagueName: String(formData.get("league_name") ?? ""),
            teamCount: Number(formData.get("team_count") ?? 0),
            ownerEmail: String(formData.get("owner_email") ?? ""),
          }
        : null,
      packageKey,
      plan: amount
        ? {
            label: planLabel,
            amountCents: dollarsToCents(amount),
            interval: String(formData.get("plan_interval") ?? "month") === "year" ? "year" : "month",
          }
        : null,
      isDemo: checked(formData, "is_demo"),
    }, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not onboard the venue.";
    redirect("/admin/onboarding?error=" + encodeURIComponent(message));
  }

  revalidatePath("/admin/onboarding");
  revalidatePath("/admin/venues");
  revalidatePath("/admin/command-center");
  redirect(
    "/admin/onboarding?done=1"
    + "&venue=" + encodeURIComponent(result.venueId)
    + "&name=" + encodeURIComponent(result.venueName)
    + "&fields=" + String(result.fieldIds.length)
    + "&surfaces=" + String(result.playSurfaceCount)
    + "&boards=" + String(result.scoreboardCount)
    + "&cameras=" + String(result.cameraCount)
    + "&audio=" + String(result.audioCount)
    + "&audioprofiles=" + String(result.audioProfileCount)
    + "&league=" + (result.leagueRequestId ? "1" : "0")
    + "&demo=" + (result.isDemo ? "1" : "0")
    + "&plan=" + (result.planApplied ? "1" : "0")
  );
}

// Deleting a tenant is the most destructive thing in this app. The service
// re-reads is_demo from the database and refuses anything that isn't a demo, so a
// forged org id here cannot take out a paying customer.
export async function teardownDemoAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) {
    redirect("/admin/onboarding?error=" + encodeURIComponent("Only GameDay platform staff can tear down a demo."));
  }
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!organizationId) redirect("/admin/onboarding?error=" + encodeURIComponent("Pick a demo to tear down."));

  // Typing the venue name back is the confirmation. Deleting the wrong tenant is
  // not recoverable from this screen.
  const confirm = String(formData.get("confirm_name") ?? "").trim();
  const expected = String(formData.get("expected_name") ?? "").trim();
  if (!confirm || confirm.toLowerCase() !== expected.toLowerCase()) {
    redirect("/admin/onboarding?error=" + encodeURIComponent(`Type "${expected}" exactly to confirm teardown.`));
  }

  try {
    await teardownDemoTenant(organizationId, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not tear down the demo.";
    redirect("/admin/onboarding?error=" + encodeURIComponent(message));
  }

  revalidatePath("/admin/onboarding");
  revalidatePath("/admin/venues");
  redirect("/admin/onboarding?torndown=" + encodeURIComponent(expected));
}
