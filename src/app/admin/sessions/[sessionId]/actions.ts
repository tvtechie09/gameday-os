"use server";

import { revalidatePath } from "next/cache";
import { updateSessionGameState, type UpdateSessionGameStateInput } from "@/lib/services/sessions";
import type { InningHalf, Session } from "@/lib/types";

export type UpdateSessionStateResult = {
  session?: Session;
  error?: string;
};

const validGameStatuses = ["scheduled", "active", "final"] as const;
const validInningHalves = ["top", "bottom"] as const;

function readNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function updateSessionStateAction(
  sessionId: string,
  fieldId: string,
  data: UpdateSessionGameStateInput,
): Promise<UpdateSessionStateResult> {
  const inningHalf = validInningHalves.includes(data.inning_half) ? data.inning_half : "top";
  const gameStatus = validGameStatuses.includes(data.game_status) ? data.game_status : "scheduled";

  try {
    const session = await updateSessionGameState(sessionId, {
      home_score: Math.max(readNumber(data.home_score, 0), 0),
      away_score: Math.max(readNumber(data.away_score, 0), 0),
      inning: Math.max(readNumber(data.inning, 1), 1),
      inning_half: inningHalf as InningHalf,
      balls: clamp(readNumber(data.balls, 0), 0, 3),
      strikes: clamp(readNumber(data.strikes, 0), 0, 2),
      outs: clamp(readNumber(data.outs, 0), 0, 2),
      game_status: gameStatus,
      primary_link_label: data.primary_link_label,
      primary_link_url: data.primary_link_url,
      secondary_link_label: data.secondary_link_label,
      secondary_link_url: data.secondary_link_url,
      notes: data.notes,
    });

    revalidatePath("/admin/sessions");
    revalidatePath(`/admin/sessions/${sessionId}`);
    revalidatePath(`/fields/${fieldId}`);

    return { session };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to save session state.",
    };
  }
}
