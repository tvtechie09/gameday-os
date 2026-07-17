"use server";

import { revalidatePath } from "next/cache";
import { updateVolunteerRoleStatus } from "@/lib/services/volunteer-roles";
import type { VolunteerRoleStatus } from "@/lib/types";

function revalidateVolunteerSurfaces() {
  revalidatePath("/admin/volunteers");
  revalidatePath("/fields/[fieldId]", "page");
  revalidatePath("/admin/sessions/[sessionId]", "page");
}

export async function updateVolunteerRoleStatusAction(id: string, status: VolunteerRoleStatus) {
  if (status !== "approved" && status !== "active" && status !== "rejected" && status !== "ended") {
    return { error: "Choose a valid volunteer role status." };
  }

  try {
    const role = await updateVolunteerRoleStatus(id, status);
    revalidateVolunteerSurfaces();
    revalidatePath(`/admin/fields/${role.fieldId}/control`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update volunteer role." };
  }
}
