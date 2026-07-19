"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSponsorCampaign, deleteSponsorCampaign, getSponsorCampaign } from "@/lib/services/sponsor-campaigns";
import { getSponsor } from "@/lib/services/sponsors";
import { assertOrganizationInScope } from "@/lib/access/scoped-venue-data";
import { SPONSOR_ASSET_TYPES } from "@/lib/services/sponsor-fulfillment-core";

export async function createCampaignAction(formData: FormData): Promise<void> {
  const sponsorId = String(formData.get("sponsor_id") ?? "").trim();
  const venueId = String(formData.get("venue_id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const packageName = String(formData.get("package_name") ?? "").trim() || null;
  const startsOn = String(formData.get("starts_on") ?? "").trim();
  const endsOn = String(formData.get("ends_on") ?? "").trim();

  if (!sponsorId || !name || !startsOn || !endsOn) {
    redirect("/admin/sponsors/campaigns?error=missing");
  }

  // Don't let a venue-scoped admin build a campaign around another org's sponsor.
  const sponsor = await getSponsor(sponsorId);
  if (!sponsor) {
    redirect("/admin/sponsors/campaigns?error=missing");
  }
  await assertOrganizationInScope(sponsor.organizationId);

  const contracted: Record<string, number> = {};
  for (const assetType of SPONSOR_ASSET_TYPES) {
    const qty = Number(formData.get(`contracted_${assetType}`) ?? 0);
    if (Number.isFinite(qty) && qty > 0) contracted[assetType] = Math.floor(qty);
  }

  let campaignId: string;
  try {
    const campaign = await createSponsorCampaign({ sponsorId, venueId, name, packageName, startsOn, endsOn, contracted });
    campaignId = campaign.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create campaign.";
    redirect(`/admin/sponsors/campaigns?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/sponsors/campaigns");
  redirect(`/admin/sponsors/campaigns/${campaignId}`);
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const id = String(formData.get("campaign_id") ?? "").trim();
  if (id) {
    const campaign = await getSponsorCampaign(id);
    if (campaign) {
      await assertOrganizationInScope(campaign.organizationId);
      await deleteSponsorCampaign(id);
      revalidatePath("/admin/sponsors/campaigns");
    }
  }
  redirect("/admin/sponsors/campaigns");
}
