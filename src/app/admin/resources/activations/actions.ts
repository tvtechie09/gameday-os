"use server";

import { revalidatePath } from "next/cache";
import { assignResourceActivationToSession, updateResourceActivationStatus } from "@/lib/services/resource-activations";
import type { ResourceActivationStatus } from "@/lib/types";

function revalidateActivationSurfaces() {
  revalidatePath("/admin/resources/activations");
  revalidatePath("/admin/resources/dashboard");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function updateActivationStatusAction(id: string, status: ResourceActivationStatus) {
  if (status !== "active" && status !== "rejected" && status !== "ended") {
    return { error: "Choose a valid activation status." };
  }

  try {
    const activation = await updateResourceActivationStatus(id, status);
    revalidateActivationSurfaces();
    revalidatePath(`/admin/fields/${activation.fieldId}/control`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update activation." };
  }
}

export async function assignActivationToSessionAction(id: string, sessionId: string) {
  if (!sessionId) {
    return { error: "Choose an active session before assigning." };
  }

  try {
    const activation = await assignResourceActivationToSession(id, sessionId);
    revalidateActivationSurfaces();
    revalidatePath(`/admin/fields/${activation.fieldId}/control`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to assign activation to session." };
  }
}
