"use server";

import { revalidatePath } from "next/cache";
import { createSponsorAssignment, deleteSponsor, deleteSponsorAssignment, getSponsor, getSponsorAssignments } from "@/lib/services/sponsors";
import { assertOrganizationInScope } from "@/lib/access/scoped-venue-data";
import { checkSponsorPolicyGate } from "@/lib/services/sponsor-policy";
import type { SponsorAssignment, SponsorAssignmentType, SponsorPlacementLabel } from "@/lib/types";

export type CreateSponsorAssignmentResult = {
  assignment?: SponsorAssignment;
  error?: string;
  // Distinguishes a policy block from an ordinary validation error, so the form
  // can reveal the override field only when an override is actually the remedy.
  policyBlocked?: boolean;
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
    // Don't let a venue-scoped admin assign another org's sponsor.
    const sponsor = await getSponsor(sponsorId);
    if (!sponsor) {
      return { error: "Sponsor not found." };
    }
    await assertOrganizationInScope(sponsor.organizationId);

    // The venue's own advertising policy. Blocked by default — an override needs
    // an explicit reason and is written to the audit log before the placement is.
    const gate = await checkSponsorPolicyGate({
      sponsor,
      overrideReason: String(formData.get("policy_override_reason") ?? ""),
      resourceType: "sponsor_assignment",
    });
    if (!gate.allowed) {
      return { error: gate.message, policyBlocked: true };
    }

    const typedAssignmentType = assignmentType as SponsorAssignmentType;
    const venueId = typedAssignmentType === "venue" ? targetId : null;
    const fieldId = typedAssignmentType === "field" ? targetId : null;
    const sessionId = typedAssignmentType === "session" ? targetId : null;

    const assignment = await createSponsorAssignment({
      sponsor_id: sponsorId,
      assignment_type: typedAssignmentType,
      venue_id: venueId,
      field_id: fieldId,
      session_id: sessionId,
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
    const sponsor = await getSponsor(sponsorId);
    if (!sponsor) {
      return {};
    }
    await assertOrganizationInScope(sponsor.organizationId);
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
    // Resolve the assignment -> its sponsor -> org, and reject a cross-org delete
    // (assignments carry no org of their own; the sponsor is the org owner).
    const assignment = (await getSponsorAssignments()).find((item) => item.id === assignmentId);
    if (!assignment) {
      return {};
    }
    const sponsor = await getSponsor(assignment.sponsorId);
    await assertOrganizationInScope(sponsor?.organizationId);
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
