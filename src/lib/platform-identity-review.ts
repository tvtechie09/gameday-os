export const IDENTITY_REVIEW_PERMISSION = "identity.review";

export type IdentityReviewFilter = "needs_review" | "deferred" | "resolved";
export type IdentityReviewAction = "LINK" | "KEEP_SEPARATE" | "DEFER";

export const identityReasonExplanations: Record<string, string> = {
  VERIFIED_EMAIL_EXACT_MATCH: "A verified email matches an existing GameDay person.",
  VERIFIED_PHONE_EXACT_MATCH: "A verified phone matches an existing GameDay person.",
  AMBIGUOUS_IDENTIFIER: "More than one person in this organization shares a verified identifier.",
  CONFLICTING_STRONG_IDENTIFIERS: "Verified identifiers point to different people, so GameDay stopped for review.",
  SAME_GUARDIAN_AND_CHILD_CONTEXT: "The name and relationship context are similar, but no verified identifier safely resolves this person.",
  EXPLICITLY_MARKED_DISTINCT: "A previous administrator decision prevents this source from linking to the proposed person.",
  NAME_ONLY_INSUFFICIENT: "The name is similar, but a name alone is not enough to link people.",
};

export function explainIdentityReason(code: string) {
  return identityReasonExplanations[code] ?? "GameDay could not resolve this identity safely without an administrator.";
}

export function projectionStatusLabel(status: string | null | undefined) {
  if (status === "COMPLETED") return "Applied";
  if (status === "PROCESSING" || status === "PENDING" || status === "RETRY") return "Processing";
  if (status === "FAILED") return "Action needed";
  return "Not required";
}

export function isIdentityReviewFilter(value: string | undefined): value is IdentityReviewFilter {
  return value === "needs_review" || value === "deferred" || value === "resolved";
}

export function canReviewIdentityOrganization(input: {
  active: boolean;
  permissions: Iterable<string>;
  scopeType: string;
  scopeId: string;
  targetOrganizationId: string;
}) {
  if (!input.active || !new Set(input.permissions).has(IDENTITY_REVIEW_PERMISSION)) return false;
  if (input.scopeType === "platform") return true;
  return input.scopeType === "organization" && input.scopeId === input.targetOrganizationId;
}
