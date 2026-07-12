"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { scheduleRoundRobin, type RoundRobinTeam } from "@/lib/round-robin";
import { createSession } from "@/lib/services/sessions";
import { getFields } from "@/lib/services/fields";
import { publicErrorMessage } from "@/lib/public-error";

export type DivisionOption = {
  id: string;
  name: string;
  teams: Array<{ teamSeasonId: string; name: string }>;
};

// League divisions from the shared GameDay Team snapshot — the org's team
// structure feeding the venue's schedule generator (one org, both sides).
export async function getTeamDivisions(): Promise<DivisionOption[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return [];
    const supabase = createClient(url, key);
    const snapshotIds = (process.env.GAMEDAY_TEAM_STATE_IDS || "gameday-team-staging,staging").split(",").map((id) => id.trim()).filter(Boolean);
    const { data: snapshots } = await supabase.from("gameday_os_state_snapshots").select("id,state").in("id", snapshotIds);
    const options: DivisionOption[] = [];
    for (const snapshot of snapshots ?? []) {
      const profile = (snapshot.state as { teamProfile?: { divisions?: Array<{ id: string; name: string }>; teamSeasons?: Array<{ id: string; displayName: string; divisionId?: string }> } })?.teamProfile;
      for (const division of profile?.divisions ?? []) {
        const teams = (profile?.teamSeasons ?? []).filter((season) => season.divisionId === division.id).map((season) => ({ teamSeasonId: season.id, name: season.displayName }));
        if (teams.length >= 2 && !options.some((option) => option.id === division.id)) {
          options.push({ id: division.id, name: division.name, teams });
        }
      }
    }
    return options;
  } catch {
    return [];
  }
}

export type GenerateResult = { created?: number; unscheduled?: number; error?: string };

export async function generateScheduleAction(formData: FormData): Promise<GenerateResult> {
  try {
    const teams = JSON.parse(String(formData.get("teams") ?? "[]")) as RoundRobinTeam[];
    const fieldIds = JSON.parse(String(formData.get("field_ids") ?? "[]")) as string[];
    const dates = JSON.parse(String(formData.get("dates") ?? "[]")) as string[];
    const startTime = String(formData.get("start_time") ?? "9:00");
    const endTime = String(formData.get("end_time") ?? "17:00");
    const gameMinutes = Number(formData.get("game_minutes") ?? 90) || 90;
    const cleanTeams = teams.filter((team) => team?.name?.trim()).slice(0, 24);
    if (cleanTeams.length < 2) return { error: "Add at least two teams." };
    if (!fieldIds.length) return { error: "Pick at least one field." };
    if (!dates.length) return { error: "Pick at least one date." };

    const allFields = await getFields();
    const fields = allFields.filter((field) => fieldIds.includes(field.id)).map((field) => ({ id: field.id, name: field.name }));
    if (!fields.length) return { error: "Those fields were not found." };

    const { matches, unscheduled } = scheduleRoundRobin(cleanTeams, fields, dates, { startTime, endTime, gameMinutes });
    let created = 0;
    for (const match of matches) {
      await createSession({
        field_id: match.fieldId,
        title: match.home.name + " vs " + match.away.name,
        sport_type: "" as never,
        home_team: match.home.name,
        away_team: match.away.name,
        start_time: match.startTime,
        end_time: match.endTime,
        status: "scheduled",
        external_source: "round-robin-generator",
        gdt_team_season_id: match.home.teamSeasonId || null,
        gdt_home_team_season_id: match.home.teamSeasonId || null,
        gdt_away_team_season_id: match.away.teamSeasonId || null
      });
      created += 1;
    }
    revalidatePath("/admin/sessions");
    return { created, unscheduled };
  } catch (error) {
    return { error: publicErrorMessage(error, "Schedule generation failed.") };
  }
}
