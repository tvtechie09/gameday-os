// Sponsor advertising policy — IO layer over sponsor-policy-core.
//
// Kept separate from organizations.ts on purpose: that module carries a
// missing-branding-column fallback whose row shape would have to grow for every
// added field. This reads the one column it needs.

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Sponsor } from "@/lib/types";
import { getActingContext } from "../access/session.ts";
import { logAudit } from "./identity.ts";
import type { SponsorCategoryKey } from "./sponsor-category-core.ts";
import {
  effectiveProhibitedCategories,
  evaluateSponsorPlacement,
  readOverrideReason,
  type EffectivePolicy,
  type PolicyDecision,
} from "./sponsor-policy-core.ts";

export async function getProhibitedCategories(organizationId: string | null | undefined): Promise<EffectivePolicy> {
  if (!organizationId) {
    // No org means no policy to honor — and no org to blame for a placement.
    // Fall back to the recommended default rather than to "anything goes".
    return effectiveProhibitedCategories(null);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("prohibited_sponsor_categories")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return effectiveProhibitedCategories(data?.prohibited_sponsor_categories);
}

export async function setProhibitedCategories(organizationId: string, categories: SponsorCategoryKey[]): Promise<void> {
  const supabase = getSupabaseAdminClient();
  // Always writes an array, never null — saving is what turns "never configured"
  // into a deliberate policy, including the deliberate empty one.
  const { error } = await supabase
    .from("organizations")
    .update({ prohibited_sponsor_categories: [...new Set(categories)] })
    .eq("id", organizationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function evaluateSponsorAgainstPolicy(sponsor: Pick<Sponsor, "category" | "organizationId">): Promise<PolicyDecision> {
  const policy = await getProhibitedCategories(sponsor.organizationId);
  return evaluateSponsorPlacement({ category: sponsor.category, prohibited: policy.categories });
}

export type PolicyGateResult = { allowed: true } | { allowed: false; message: string };

// The write-side gate. A blocked placement proceeds only with an explicit reason,
// and the override is recorded before the write — an override nobody can find
// later is the same as no override at all.
export async function checkSponsorPolicyGate(input: {
  sponsor: Pick<Sponsor, "id" | "name" | "category" | "organizationId">;
  overrideReason: string | null | undefined;
  resourceType: string;
  resourceId?: string | null;
}): Promise<PolicyGateResult> {
  const decision = await evaluateSponsorAgainstPolicy(input.sponsor);

  if (!decision.blocked) {
    return { allowed: true };
  }

  const reason = readOverrideReason(input.overrideReason);
  if (!reason) {
    return { allowed: false, message: decision.message };
  }

  const actor = await getActingContext();
  await logAudit({
    actorUserId: actor?.userId ?? null,
    action: "sponsor_policy.override",
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? input.sponsor.id,
    // "tenant" is this schema's name for the organization scope — audit_logs has
    // a CHECK constraint on scope_type, and "organization" is not in it.
    scopeType: "tenant",
    scopeId: input.sponsor.organizationId ?? null,
    metadata: {
      sponsorId: input.sponsor.id,
      sponsorName: input.sponsor.name,
      category: decision.category,
      categoryLabel: decision.categoryLabel,
      reason,
      // Recorded even when the actor is impersonating, so the trail names the
      // human at the keyboard rather than the account they borrowed.
      impersonating: actor?.isImpersonating ?? false,
    },
  });

  return { allowed: true };
}
