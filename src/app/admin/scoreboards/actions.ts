"use server";

import { revalidatePath } from "next/cache";
import { createScoreboardProfile, updateScoreboardProfile } from "@/lib/services/scoreboards";
import type { ScoreboardProfile } from "@/lib/types";
import { readScoreboardProfileFormData } from "./form-utils";

export type ScoreboardProfileResult = {
  profile?: ScoreboardProfile;
  error?: string;
};

function revalidateScoreboardSurfaces(fieldId?: string) {
  revalidatePath("/admin/scoreboards");

  if (fieldId) {
    revalidatePath(`/admin/fields/${fieldId}/control`);
    revalidatePath(`/fields/${fieldId}`);
  }
}

export async function createScoreboardProfileAction(formData: FormData): Promise<ScoreboardProfileResult> {
  const parsed = readScoreboardProfileFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const profile = await createScoreboardProfile(parsed.data);
    revalidateScoreboardSurfaces(profile.fieldId);
    return { profile };
  } catch (error) {
    console.error("Failed to create scoreboard profile", error);
    return { error: error instanceof Error ? error.message : "Unable to create scoreboard profile." };
  }
}

export async function updateScoreboardProfileAction(id: string, formData: FormData): Promise<ScoreboardProfileResult> {
  const parsed = readScoreboardProfileFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const profile = await updateScoreboardProfile(id, parsed.data);
    revalidateScoreboardSurfaces(profile.fieldId);
    return { profile };
  } catch (error) {
    console.error("Failed to update scoreboard profile", error);
    return { error: error instanceof Error ? error.message : "Unable to update scoreboard profile." };
  }
}
