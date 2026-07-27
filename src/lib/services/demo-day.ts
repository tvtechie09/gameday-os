import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { canManagePlatform, isPlatformAdmin, type AccessContext } from "@/lib/access/capabilities";
import { planDemoDay, type DemoSlot } from "@/lib/services/demo-day-core";

// Demo day refresh (IO). One click before a walkthrough re-times the demo games
// onto today so the Command Center looks like a live Saturday.
//
// THE SAFETY RULE: this only ever touches sessions flagged `is_demo = true`. A real
// venue's schedule is structurally unreachable from here — not by convention, by
// query. Do not add a venue-id override.

export * from "@/lib/services/demo-day-core";

export type DemoRefreshResult = {
  updated: number;
  finals: number;
  live: number;
  behind: number;
  scheduled: number;
  workOrdersSeeded: number;
  campaignReady: boolean;
};

function legacyStatus(slot: DemoSlot): { status: string; lifecycle: string } {
  if (slot.status === "final") return { status: "final", lifecycle: "final" };
  if (slot.status === "active") return { status: "active", lifecycle: "live" };
  return { status: "scheduled", lifecycle: "scheduled" };
}

// Plausible scoreboard numbers so the board doesn't read 0-0 across a whole day.
function demoScore(index: number, slot: DemoSlot): { home: number; away: number } {
  if (slot.status === "scheduled") return { home: 0, away: 0 };
  const home = (index * 3 + 2) % 9;
  const away = (index * 5 + 1) % 7;
  return { home, away };
}

// The demo venue is derived FROM the demo sessions, never named or passed in.
// That reuses the one guard we already trust (`is_demo = true` on sessions)
// instead of inventing a second, weaker one — work orders and campaigns have no
// is_demo flag of their own, and venues.is_demo is false on the flagship demo
// venue (the column defaulted false for pre-existing rows).
async function resolveDemoVenue(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  demoSessionIds: string[],
): Promise<{ venueId: string; organizationId: string | null; fieldIds: string[] } | null> {
  if (!demoSessionIds.length) return null;
  const { data: sessionRows } = await supabase.from("sessions").select("field_id").in("id", demoSessionIds).eq("is_demo", true);
  const fieldIds = [...new Set((sessionRows ?? []).map((r) => (r as { field_id: string }).field_id).filter(Boolean))];
  if (!fieldIds.length) return null;

  const { data: fieldRows } = await supabase.from("fields").select("id,venue_id").in("id", fieldIds);
  const venueId = (fieldRows ?? [])[0] ? (fieldRows as Array<{ venue_id: string }>)[0].venue_id : null;
  if (!venueId) return null;

  // Every field at that venue, so seeded work orders can land anywhere sensible.
  const { data: venueFields } = await supabase.from("fields").select("id").eq("venue_id", venueId);
  const { data: venueRow } = await supabase.from("venues").select("organization_id").eq("id", venueId).maybeSingle();

  return {
    venueId,
    organizationId: (venueRow as { organization_id: string | null } | null)?.organization_id ?? null,
    fieldIds: (venueFields ?? []).map((r) => (r as { id: string }).id),
  };
}

// The 6:00 demo beat hands an issue off (assign -> "I'm on it"), so the day needs
// at least one OPEN, UNASSIGNED issue to hand off. Idempotent: if anything is
// already open we leave it alone rather than piling up duplicates on every click.
async function seedDemoWorkOrders(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  demo: { fieldIds: string[] },
): Promise<number> {
  if (!demo.fieldIds.length) return 0;
  const { data: existing } = await supabase
    .from("field_work_orders")
    .select("id")
    .in("field_id", demo.fieldIds)
    .neq("status", "done")
    .limit(1);
  if ((existing ?? []).length > 0) return 0;

  // Realistic titles — a prospect reads these, so no "[demo]" prefixes.
  const seeds = [
    { field_id: demo.fieldIds[0], title: "Mound clay needs tamping — third-base side", detail: "Lip washed out after last night's rain.", priority: "high" },
    { field_id: demo.fieldIds[Math.min(1, demo.fieldIds.length - 1)], title: "Bleacher rail loose behind the dugout", detail: "Third section from the gate. Safety check before the afternoon wave.", priority: "normal" },
  ];
  const { data: inserted } = await supabase.from("field_work_orders").insert(seeds).select("id");
  return (inserted ?? []).length;
}

// The 12:00 beat is the Proof-of-Performance report, which needs a campaign whose
// window covers TODAY — a stale window would show a 0% delivery rate in front of a
// prospect, which is worse than showing nothing. Contracted quantities are tuned to
// the day that was just built so the report reads mostly-delivered with one line
// short, which is what lets the make-good line be demoed honestly.
async function ensureDemoCampaign(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  demo: { venueId: string; organizationId: string | null },
  counts: { started: number; finals: number },
): Promise<boolean> {
  const { data: sponsorRows } = await supabase
    .from("sponsors")
    .select("id")
    .eq("organization_id", demo.organizationId ?? "")
    .order("created_at", { ascending: true })
    .limit(1);
  const sponsorId = (sponsorRows ?? [])[0] ? (sponsorRows as Array<{ id: string }>)[0].id : null;
  if (!sponsorId) return false;

  const today = new Date().toISOString().slice(0, 10);
  const contracted = {
    scoreboard_logo: counts.started * 2,
    pregame_announcement: counts.started,
    livestream_bumper: counts.started,
    // Deliberately a couple over what today can deliver, so the make-good line
    // has something honest and small to show.
    final_score_graphic: counts.finals + 2,
  };

  const { data: existing } = await supabase
    .from("sponsor_campaigns")
    .select("id")
    .eq("venue_id", demo.venueId)
    .eq("name", DEMO_CAMPAIGN_NAME)
    .limit(1);

  if ((existing ?? []).length > 0) {
    const id = (existing as Array<{ id: string }>)[0].id;
    const { error } = await supabase
      .from("sponsor_campaigns")
      .update({ starts_on: today, ends_on: today, contracted, status: "active", updated_at: new Date().toISOString() })
      .eq("id", id);
    return !error;
  }

  const { error } = await supabase.from("sponsor_campaigns").insert({
    organization_id: demo.organizationId,
    sponsor_id: sponsorId,
    venue_id: demo.venueId,
    name: DEMO_CAMPAIGN_NAME,
    package_name: "Weekend Sponsor Package",
    starts_on: today,
    ends_on: today,
    contracted,
    status: "active",
  });
  return !error;
}

const DEMO_CAMPAIGN_NAME = "Weekend Sponsor Package — Saturday";

export async function refreshDemoDay(ctx: AccessContext | null): Promise<DemoRefreshResult> {
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) {
    throw new Error("Only GameDay platform staff can refresh the demo day.");
  }
  const supabase = getSupabaseAdminClient();

  // ONLY demo sessions. This is the guard — never widen it.
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("is_demo", true)
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((r) => (r as { id: string }).id);
  if (!ids.length) {
    throw new Error("No demo sessions found. Mark the demo venue's games as demo sessions first.");
  }

  const slots = planDemoDay(ids, Date.now());
  let updated = 0;
  for (const [index, slot] of slots.entries()) {
    const legacy = legacyStatus(slot);
    const score = demoScore(index, slot);
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        start_time: slot.startTime,
        end_time: slot.endTime,
        status: legacy.status,
        game_status: legacy.status,
        lifecycle_status: legacy.lifecycle,
        home_score: score.home,
        away_score: score.away,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slot.id)
      .eq("is_demo", true); // belt and braces: the guard again at write time
    if (!updateError) updated += 1;
  }

  const finals = slots.filter((s) => s.status === "final").length;
  const live = slots.filter((s) => s.status === "active").length;

  // A hot schedule alone isn't a demoable day: the 6:00 beat needs an issue to
  // hand off and the 12:00 beat needs a campaign windowed onto today. Both are
  // best-effort — a failure here must never break the schedule refresh, which is
  // the part the whole walkthrough depends on.
  let workOrdersSeeded = 0;
  let campaignReady = false;
  try {
    const demo = await resolveDemoVenue(supabase, ids);
    if (demo) {
      workOrdersSeeded = await seedDemoWorkOrders(supabase, demo);
      campaignReady = await ensureDemoCampaign(supabase, demo, { started: finals + live, finals });
    }
  } catch (error) {
    console.error("Demo day refresh: operations seeding skipped", error);
  }

  return {
    updated,
    finals,
    live,
    behind: slots.filter((s) => s.behind).length,
    scheduled: slots.filter((s) => s.status === "scheduled").length,
    workOrdersSeeded,
    campaignReady,
  };
}
