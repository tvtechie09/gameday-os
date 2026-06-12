"use server";

import { revalidatePath } from "next/cache";
import { updateResourceActivationStatus } from "@/lib/services/resource-activations";
import type { ResourceActivationStatus } from "@/lib/types";

function revalidateActivationSurfaces() {
  revalidatePath("/admin/resources/activations");
  revalidatePath("/admin/dashboard");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function updateActivationStatusAction(id: string, status: ResourceActivationStatus) {
  if (status !== "active" && status !== "rejected" && status !== "ended") {
    return { error: "Choose a valid activation status." };
  }

  try {
    await updateResourceActivationStatus(id, status);
    revalidateActivationSurfaces();
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update activation." };
  }
}
