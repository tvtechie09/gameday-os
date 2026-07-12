import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

// Combined district view: league structure from the shared GameDay Team
// snapshot plus venue operations counts — one report for the park-district
// director who runs both sides.

export type DistrictReport = {
  available: boolean;
  divisions: number;
  teams: number;
  players: number;
  pendingVerifications: number;
  upcomingBookings: number;
  openWorkOrders: number;
};

type TeamSnapshotProfile = {
  divisions?: Array<{ id: string }>;
  teamSeasons?: Array<{ id: string }>;
  players?: Array<{ id: string; archived?: boolean }>;
  verificationRecords?: Array<{ status?: string }>;
};

export async function getDistrictReport(): Promise<DistrictReport> {
  const empty: DistrictReport = { available: false, divisions: 0, teams: 0, players: 0, pendingVerifications: 0, upcomingBookings: 0, openWorkOrders: 0 };
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return empty;
    const supabase = createClient(url, key);
    const snapshotIds = (process.env.GAMEDAY_TEAM_STATE_IDS || "gameday-team-staging,staging").split(",").map((id) => id.trim()).filter(Boolean);
    const { data: snapshots } = await supabase.from("gameday_os_state_snapshots").select("id,state").in("id", snapshotIds);

    const report = { ...empty, available: true };
    const seenDivisions = new Set<string>();
    const seenTeams = new Set<string>();
    const seenPlayers = new Set<string>();
    for (const snapshot of snapshots ?? []) {
      const profile = (snapshot.state as { teamProfile?: TeamSnapshotProfile })?.teamProfile;
      for (const division of profile?.divisions ?? []) seenDivisions.add(division.id);
      for (const season of profile?.teamSeasons ?? []) seenTeams.add(season.id);
      for (const player of profile?.players ?? []) {
        if (!player.archived) seenPlayers.add(player.id);
      }
      report.pendingVerifications += (profile?.verificationRecords ?? []).filter((verification) => (verification.status ?? "pending") === "pending").length;
    }
    report.divisions = seenDivisions.size;
    report.teams = seenTeams.size;
    report.players = seenPlayers.size;

    try {
      const admin = getSupabaseAdminClient();
      const [{ count: bookings }, { count: workOrders }] = await Promise.all([
        admin.from("field_bookings").select("id", { count: "exact", head: true }).gte("ends_at", new Date().toISOString()).neq("status", "cancelled"),
        admin.from("field_work_orders").select("id", { count: "exact", head: true }).neq("status", "done"),
      ]);
      report.upcomingBookings = bookings ?? 0;
      report.openWorkOrders = workOrders ?? 0;
    } catch {
      // Venue ops counts are decoration; league counts still render.
    }

    return report;
  } catch {
    return empty;
  }
}
