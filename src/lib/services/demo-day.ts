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

export type DemoRefreshResult = { updated: number; finals: number; live: number; behind: number; scheduled: number };

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

  return {
    updated,
    finals: slots.filter((s) => s.status === "final").length,
    live: slots.filter((s) => s.status === "active").length,
    behind: slots.filter((s) => s.behind).length,
    scheduled: slots.filter((s) => s.status === "scheduled").length,
  };
}
