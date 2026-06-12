"use server";

import { revalidatePath } from "next/cache";
import { createSponsorAssignment, deleteSponsor, deleteSponsorAssignment } from "@/lib/services/sponsors";
import type { SponsorAssignment, SponsorAssignmentType, SponsorPlacementLabel } from "@/lib/types";

export type CreateSponsorAssignmentResult = {
  assignment?: SponsorAssignment;
  error?: string;
};

const validAssignmentTypes = ["venue", "field", "session"] as const;
const validPlacementLabels = ["Presented By", "Field Sponsor", "Game Sponsor", "Featured Sponsor"] as const;

export async function createSponsorAssignmentAction(formData: FormData): Promise<CreateSponsorAssignmentResult> {
  const sponsorId = String(formData.get("sponsor_id") ?? "").trim();
  const assignmentType = String(formData.get("assignment_type") ?? "").trim();
  const targetId = String(formData.get("target_id") ?? "").trim();
  const placementLabel = String(formData.get("placement_label") ?? "").trim();

  if (!sponsorId || !assignmentType || !targetId || !placementLabel) {
    return { error: "Sponsor, assignment type, target, and placement label are required." };
  }

  if (!validAssignmentTypes.includes(assignmentType as SponsorAssignmentType)) {
    return { error: "Choose a valid assignment type." };
  }

  if (!validPlacementLabels.includes(placementLabel as SponsorPlacementLabel)) {
    return { error: "Choose a valid placement label." };
  }

  try {
    const typedAssignmentType = assignmentType as SponsorAssignmentType;
    const assignment = await createSponsorAssignment({
      sponsor_id: sponsorId,
      assignment_type: typedAssignmentType,
      venue_id: typedAssignmentType === "venue" ? targetId : null,
      field_id: typedAssignmentType === "field" ? targetId : null,
      session_id: typedAssignmentType === "session" ? targetId : null,
      placement_label: placementLabel as SponsorPlacementLabel,
    });

    revalidatePath("/admin/sponsors");
    revalidatePath("/fields/[fieldId]", "page");
    return { assignment };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create sponsor assignment.",
    };
  }
}

export async function deleteSponsorAction(sponsorId: string): Promise<{ error?: string }> {
  try {
    await deleteSponsor(sponsorId);
    revalidatePath("/admin/sponsors");
    revalidatePath("/fields/[fieldId]", "page");
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to delete sponsor.",
    };
  }
}

export async function deleteSponsorAssignmentAction(assignmentId: string): Promise<{ error?: string }> {
  try {
    await deleteSponsorAssignment(assignmentId);
    revalidatePath("/admin/sponsors");
    revalidatePath("/fields/[fieldId]", "page");
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to delete sponsor assignment.",
    };
  }
}
