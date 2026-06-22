"use server";

import { revalidatePath } from "next/cache";
import {
  createScoreboardAdapter,
  runScoreboardAdapterTest,
  scoreboardAdapterTypes,
  type CreateScoreboardAdapterInput,
} from "@/lib/services/scoreboard-adapters";
import type { ScoreboardAdapter } from "@/lib/types";

export type ScoreboardAdapterResult = {
  adapter?: ScoreboardAdapter;
  error?: string;
};

function revalidateAdapterPages() {
  revalidatePath("/admin/scoreboards");
  revalidatePath("/admin/scoreboards/adapters");
}

export async function createScoreboardAdapterAction(formData: FormData): Promise<ScoreboardAdapterResult> {
  const scoreboardId = String(formData.get("scoreboard_id") ?? "").trim();
  const adapterType = String(formData.get("adapter_type") ?? "manual").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!scoreboardId) {
    return { error: "Choose a scoreboard profile." };
  }

  if (!scoreboardAdapterTypes.includes(adapterType as CreateScoreboardAdapterInput["adapter_type"])) {
    return { error: "Choose a valid adapter type." };
  }

  try {
    const adapter = await createScoreboardAdapter({
      adapter_type: adapterType as CreateScoreboardAdapterInput["adapter_type"],
      notes,
      scoreboard_id: scoreboardId,
    });
    revalidateAdapterPages();
    return { adapter };
  } catch (error) {
    console.error("Failed to create scoreboard adapter", error);
    return { error: error instanceof Error ? error.message : "Unable to create scoreboard adapter." };
  }
}

export async function createScoreboardAdapterFormAction(formData: FormData): Promise<void> {
  const result = await createScoreboardAdapterAction(formData);

  if (result.error) {
    console.error("Failed to create scoreboard adapter from form", result.error);
  }
}

export async function runScoreboardAdapterTestAction(adapterId: string): Promise<ScoreboardAdapterResult> {
  try {
    const adapter = await runScoreboardAdapterTest(adapterId);
    revalidateAdapterPages();
    return { adapter };
  } catch (error) {
    console.error("Failed to run scoreboard adapter test", error);
    return { error: error instanceof Error ? error.message : "Unable to run adapter test mode." };
  }
}
