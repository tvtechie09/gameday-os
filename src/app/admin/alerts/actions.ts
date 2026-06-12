"use server";

import { revalidatePath } from "next/cache";
import { createAlert } from "@/lib/services/alerts";
import type { Alert } from "@/lib/types";
import { readAlertFormData } from "./form-utils";

export type CreateAlertResult = {
  alert?: Alert;
  error?: string;
};

function revalidateAlertSurfaces() {
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/tournaments");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function createAlertAction(formData: FormData): Promise<CreateAlertResult> {
  const parsed = readAlertFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const alert = await createAlert(parsed.data);
    revalidateAlertSurfaces();
    return { alert };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create alert." };
  }
}
