import { canManagePlatform, isPlatformAdmin, type AccessContext } from "@/lib/access/capabilities";
import { publicAppUrlPointsToLocalhost } from "@/lib/public-url";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { refreshDemoDay } from "@/lib/services/demo-day";
import { buildClientReadinessChecks, buildReferenceDemoGames, summarizeClientReadiness, REFERENCE_DEMO_SOURCE, type ClientReadinessCheck } from "@/lib/services/client-readiness-core";
import { listDemoTenants } from "@/lib/services/provisioning";

export * from "@/lib/services/client-readiness-core";

export type DemoTenantReadiness = { checks: ClientReadinessCheck[]; organizationId: string; organizationName: string; ready: boolean; venueId: string; venueName: string };
export type ReferenceDemoPreparation = { campaignReady: boolean; gamesReady: number; sponsorReady: boolean; weatherReady: boolean };

function requirePlatform(ctx: AccessContext | null) {
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) throw new Error("Only GameDay platform staff can manage reference demos.");
}

export async function getDemoTenantReadiness(ctx: AccessContext | null): Promise<DemoTenantReadiness[]> {
  requirePlatform(ctx);
  const supabase = getSupabaseAdminClient();
  const demos = await listDemoTenants(ctx);
  return Promise.all(demos.filter((demo) => demo.venueId).map(async (demo) => {
    const venueId = demo.venueId!;
    const [{ data: venue }, { count: sessionCount }, { data: weather }, { count: sponsorCount }, { count: campaignCount }] = await Promise.all([
      supabase.from("venues").select("name,address,city,state,timezone").eq("id", venueId).maybeSingle(),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("organization_id", demo.organizationId).eq("is_demo", true).eq("external_source", REFERENCE_DEMO_SOURCE),
      supabase.from("weather_profiles").select("status").eq("venue_id", venueId),
      supabase.from("sponsors").select("id", { count: "exact", head: true }).eq("organization_id", demo.organizationId),
      supabase.from("sponsor_campaigns").select("id", { count: "exact", head: true }).eq("venue_id", venueId),
    ]);
    const checks = buildClientReadinessChecks({
      campaignCount: campaignCount ?? 0,
      demoSessionCount: sessionCount ?? 0,
      fieldCount: demo.fieldCount,
      publicUrlReady: !publicAppUrlPointsToLocalhost(),
      sponsorCount: sponsorCount ?? 0,
      venueProfileReady: Boolean(venue?.name && venue.address && venue.city && venue.state && venue.timezone),
      weatherReady: (weather ?? []).some((profile) => profile.status === "configured" || profile.status === "monitoring"),
    });
    return { checks, organizationId: demo.organizationId, organizationName: demo.organizationName, ready: summarizeClientReadiness(checks).canDemo, venueId, venueName: demo.venueName ?? demo.organizationName };
  }));
}

export async function prepareReferenceDemoTenant({ ctx, organizationId, venueId }: { ctx: AccessContext | null; organizationId: string; venueId: string }): Promise<ReferenceDemoPreparation> {
  requirePlatform(ctx);
  const supabase = getSupabaseAdminClient();
  const [{ data: organization }, { data: venue }] = await Promise.all([
    supabase.from("organizations").select("id,is_demo").eq("id", organizationId).maybeSingle(),
    supabase.from("venues").select("id,organization_id,is_demo,name").eq("id", venueId).maybeSingle(),
  ]);
  if (!organization?.is_demo || !venue?.is_demo || venue.organization_id !== organizationId) throw new Error("Reference preparation is restricted to a verified demo tenant.");

  const { data: fields, error: fieldError } = await supabase.from("fields").select("id,parent_field_id").eq("venue_id", venueId).order("created_at");
  if (fieldError) throw new Error(fieldError.message);
  const allFields = fields ?? [];
  const childFields = allFields.filter((field) => field.parent_field_id);
  const playableFieldIds = (childFields.length > 0 ? childFields : allFields).map((field) => field.id);
  if (playableFieldIds.length === 0) throw new Error("Add at least one field before preparing the reference demo.");

  const games = buildReferenceDemoGames({ fieldIds: playableFieldIds, organizationId, now: Date.now() });
  const { data: existingGames, error: existingGamesError } = await supabase.from("sessions").select("id,external_source_id").eq("organization_id", organizationId).eq("external_source", REFERENCE_DEMO_SOURCE);
  if (existingGamesError) throw new Error("Could not inspect the demo schedule: " + existingGamesError.message);
  const existingIdByExternalId = new Map((existingGames ?? []).map((game) => [game.external_source_id, game.id]));
  for (const game of games) {
    const row = {
      away_team: game.awayTeam, end_time: game.endTime, external_source: REFERENCE_DEMO_SOURCE, external_source_id: game.externalId,
      field_id: game.fieldId, game_status: "scheduled", home_team: game.homeTeam, is_demo: true, lifecycle_status: "scheduled",
      organization_id: organizationId, sport_type: "baseball", start_time: game.startTime, status: "scheduled", title: game.title, updated_at: new Date().toISOString(),
    };
    const existingId = existingIdByExternalId.get(game.externalId);
    const { error } = existingId
      ? await supabase.from("sessions").update(row).eq("id", existingId).eq("is_demo", true)
      : await supabase.from("sessions").insert(row);
    if (error) throw new Error("Could not prepare the demo schedule: " + error.message);
  }

  const { data: weatherProfiles } = await supabase.from("weather_profiles").select("id,status").eq("venue_id", venueId).limit(1);
  let weatherReady = false;
  if ((weatherProfiles ?? []).length > 0) {
    const { error } = await supabase.from("weather_profiles").update({ notes: "Reference demo profile. Presenter confirms live conditions before use.", status: "configured", updated_at: new Date().toISOString(), weather_source: "manual" }).eq("id", weatherProfiles![0].id);
    weatherReady = !error;
  } else {
    const { error } = await supabase.from("weather_profiles").insert({ location_name: venue.name, notes: "Reference demo profile. Presenter confirms live conditions before use.", status: "configured", venue_id: venueId, weather_source: "manual" });
    weatherReady = !error;
  }

  const { data: existingSponsors } = await supabase.from("sponsors").select("id").eq("organization_id", organizationId).limit(1);
  let sponsorId = existingSponsors?.[0]?.id ?? null;
  if (!sponsorId) {
    const { data: sponsor, error } = await supabase.from("sponsors").insert({ category: "bank_financial", description: "Reference sponsor used only in disposable GameDay demo tenants.", name: "Community First Bank", organization_id: organizationId, website_url: "https://example.com" }).select("id").single();
    if (!error) sponsorId = sponsor?.id ?? null;
  }

  let sponsorReady = Boolean(sponsorId);
  if (sponsorId) {
    const { data: assignment } = await supabase.from("sponsor_assignments").select("id").eq("sponsor_id", sponsorId).eq("venue_id", venueId).limit(1);
    if ((assignment ?? []).length === 0) {
      const { error } = await supabase.from("sponsor_assignments").insert({ assignment_type: "venue", placement_label: "Presented By", sponsor_id: sponsorId, venue_id: venueId });
      sponsorReady = !error;
    }
  }

  const { data: preparedGames, error: preparedGamesError } = await supabase
    .from("sessions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_demo", true)
    .eq("external_source", REFERENCE_DEMO_SOURCE);
  if (preparedGamesError) throw new Error("Could not verify the prepared demo schedule: " + preparedGamesError.message);
  const refreshed = await refreshDemoDay(ctx, { sessionIds: (preparedGames ?? []).map((game) => game.id) });
  return { campaignReady: refreshed.campaignReady, gamesReady: refreshed.updated, sponsorReady, weatherReady };
}
