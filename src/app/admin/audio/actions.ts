"use server";

import { revalidatePath } from "next/cache";
import { createAudioProfile, updateAudioProfile } from "@/lib/services/audio-profiles";
import type { AudioProfile } from "@/lib/types";
import { readAudioProfileFormData } from "./form-utils";

export type AudioProfileResult = {
  error?: string;
  profile?: AudioProfile;
};

function revalidateAudioSurfaces(fieldId?: string) {
  revalidatePath("/admin/audio");

  if (fieldId) {
    revalidatePath(`/admin/fields/${fieldId}/control`);
    revalidatePath(`/fields/${fieldId}`);
  }
}

export async function createAudioProfileAction(formData: FormData): Promise<AudioProfileResult> {
  const parsed = readAudioProfileFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const profile = await createAudioProfile(parsed.data);
    revalidateAudioSurfaces(profile.fieldId);
    return { profile };
  } catch (error) {
    console.error("Failed to create audio profile", error);
    return { error: error instanceof Error ? error.message : "Unable to create audio profile." };
  }
}

export async function updateAudioProfileAction(id: string, formData: FormData): Promise<AudioProfileResult> {
  const parsed = readAudioProfileFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const profile = await updateAudioProfile(id, parsed.data);
    revalidateAudioSurfaces(profile.fieldId);
    return { profile };
  } catch (error) {
    console.error("Failed to update audio profile", error);
    return { error: error instanceof Error ? error.message : "Unable to update audio profile." };
  }
}
