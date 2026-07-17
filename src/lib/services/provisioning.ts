import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { canManagePlatform, isPlatformAdmin, type AccessContext } from "@/lib/access/capabilities";
import { upsertBillingPlan } from "@/lib/services/billing";
import {
  buildFieldNames,
  slugify,
  validateProvisionInput,
  type ProvisionInput,
} from "@/lib/services/provisioning-core";

// Customer onboarding (IO). Turns a signed founding venue into a live venue in one
// submit: organization -> venue -> fields -> optional billing plan.
//
// Why this doesn't reuse createVenue()/createField(): those derive the org from the
// CURRENT scope and requirePermission against an org/venue that does not exist yet
// during onboarding. Provisioning is its own path, gated on platform staff, writing
// with the service role.

export * from "@/lib/services/provisioning-core";

export type ProvisionResult = {
  organizationId: string;
  organizationSlug: string;
  venueId: string;
  venueName: string;
  fieldIds: string[];
  fieldNames: string[];
  planApplied: boolean;
};

// Organizations.slug must be unique — append -2, -3, ... if taken.
async function uniqueSlug(base: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("organizations").select("slug").like("slug", base + "%");
  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function provisionVenue(input: ProvisionInput, ctx: AccessContext | null): Promise<ProvisionResult> {
  // Only GameDay staff may create a customer. There is no self-serve signup.
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) {
    throw new Error("Only GameDay platform staff can onboard a venue.");
  }
  const check = validateProvisionInput(input);
  if (!check.ok) throw new Error(check.error);

  const supabase = getSupabaseAdminClient();
  const slug = await uniqueSlug(slugify(input.organizationName));

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: input.organizationName.trim().slice(0, 160), slug })
    .select("id,slug")
    .single();
  if (orgError) throw new Error("Could not create the organization: " + orgError.message);

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .insert({
      organization_id: org.id,
      name: input.venueName.trim().slice(0, 160),
      address: input.address?.trim().slice(0, 200) || null,
      city: input.city?.trim().slice(0, 120) || null,
      state: input.state?.trim().slice(0, 60) || null,
    })
    .select("id,name")
    .single();
  if (venueError) {
    // Don't strand an organization with no venue.
    await supabase.from("organizations").delete().eq("id", org.id);
    throw new Error("Could not create the venue: " + venueError.message);
  }

  const names = buildFieldNames(input.fieldCount, input.fieldNamePattern);
  // NOTE the two status columns: legacy `status` is NOT NULL and constrained to
  // 'Ready' | 'Maintenance' | 'Weather hold' (default 'Ready'), while the app reads
  // `field_status` ('open' | 'delayed' | ...). Let both defaults apply and set the
  // app column explicitly, exactly like createField does — never write `status`.
  const { data: fields, error: fieldError } = await supabase
    .from("fields")
    .insert(names.map((name) => ({
      organization_id: org.id,
      venue_id: venue.id,
      name,
      sport_type: input.sportType || "baseball",
      field_status: "open",
    })))
    .select("id,name");
  if (fieldError) {
    // Onboarding is all-or-nothing: never strand a half-built customer with an
    // organization and venue but no fields.
    await supabase.from("fields").delete().eq("venue_id", venue.id);
    await supabase.from("venues").delete().eq("id", venue.id);
    await supabase.from("organizations").delete().eq("id", org.id);
    throw new Error("Could not create the fields (nothing was saved): " + fieldError.message);
  }

  let planApplied = false;
  if (input.plan) {
    try {
      await upsertBillingPlan({
        organizationId: org.id,
        planLabel: input.plan.label,
        amountCents: input.plan.amountCents,
        billingInterval: input.plan.interval,
        status: "active",
      });
      planApplied = true;
    } catch {
      // Billing is recorded separately; never fail onboarding over it.
      planApplied = false;
    }
  }

  return {
    organizationId: org.id,
    organizationSlug: org.slug,
    venueId: venue.id,
    venueName: venue.name,
    fieldIds: (fields ?? []).map((f) => (f as { id: string }).id),
    fieldNames: (fields ?? []).map((f) => (f as { name: string }).name),
    planApplied,
  };
}
