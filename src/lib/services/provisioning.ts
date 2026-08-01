import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { canManagePlatform, isPlatformAdmin, type AccessContext } from "@/lib/access/capabilities";
import { upsertBillingPlan } from "@/lib/services/billing";
import {
  planFields,
  slugify,
  surfaceTypeForSport,
  validateProvisionInput,
  type PlannedField,
  type ProvisionInput,
} from "@/lib/services/provisioning-core";
import { normalizeVenueTimezone } from "@/lib/venue-timezone";

// Customer onboarding (IO). Turns a signed founding venue into a live venue in one
// submit: organization -> venue -> fields (+ splits) -> play surfaces -> technology
// -> optional billing plan -> optional league intent.
//
// Why this doesn't reuse createVenue()/createField(): those derive the org from the
// CURRENT scope and requirePermission against an org/venue that does not exist yet
// during onboarding. Provisioning is its own path, gated on platform staff, writing
// with the service role.

export * from "@/lib/services/provisioning-core";

// venue_assets and league_onboarding_requests are deliberately NOT in
// supabase/types.ts. That Database type sits at TypeScript's instantiation limit:
// adding either table tips supabase-js's inference over and collapses unrelated
// queries to `never` (343 type errors across the app, from 24). This is why
// venue-assets.ts already reaches for the same escape hatch.
//
// So we describe just the shape we use. Narrow on purpose -- this is a hole in the
// type system, and a small hole is easier to see than a large one.
type DynamicProvisioningSupabase = {
  from: (table: string) => {
    insert: (rows: Record<string, unknown>[] | Record<string, unknown>) => {
      select: (columns: string) => Promise<{
        data: Record<string, unknown>[] | null;
        error: { message?: string } | null;
      }>;
    };
    delete: () => { eq: (column: string, value: string) => Promise<{ error: { message?: string } | null }> };
  };
};

export type ProvisionResult = {
  organizationId: string;
  organizationSlug: string;
  venueId: string;
  venueName: string;
  fieldIds: string[];
  fieldNames: string[];
  playSurfaceCount: number;
  scoreboardCount: number;
  cameraCount: number;
  audioCount: number;
  audioProfileCount: number;
  leagueRequestId: string | null;
  planApplied: boolean;
  isDemo: boolean;
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

// Unwind a partial provision. Order matters: children reference parents, surfaces
// and hardware reference fields, everything references the venue.
//
// Onboarding is all-or-nothing. A half-built customer -- an org with a venue but no
// fields -- is worse than a failed submit, because nobody knows it's broken until a
// GM signs in to an empty complex.
async function unwind(orgId: string, venueId: string | null): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const dynamic = supabase as unknown as DynamicProvisioningSupabase;
  if (venueId) {
    await dynamic.from("audio_profiles").delete().eq("venue_id", venueId);
    await dynamic.from("venue_assets").delete().eq("venue_id", venueId);
    await supabase.from("resources").delete().eq("venue_id", venueId);
    await supabase.from("play_surfaces").delete().eq("venue_id", venueId);
    // Split children first: fields.parent_field_id points at another fields row.
    await supabase.from("fields").delete().eq("venue_id", venueId).not("parent_field_id", "is", null);
    await supabase.from("fields").delete().eq("venue_id", venueId);
    await supabase.from("venues").delete().eq("id", venueId);
  }
  await dynamic.from("league_onboarding_requests").delete().eq("organization_id", orgId);
  await supabase.from("organizations").delete().eq("id", orgId);
}

// NOTE the two status columns on `fields`: legacy `status` is NOT NULL and
// constrained to 'Ready' | 'Maintenance' | 'Weather hold' (default 'Ready'), while
// the app reads `field_status` ('open' | 'delayed' | ...). Let the `status` default
// apply and set the app column explicitly — never write `status`.
function fieldRow(planned: PlannedField, orgId: string, venueId: string, input: ProvisionInput, parentId: string | null) {
  return {
    organization_id: orgId,
    venue_id: venueId,
    name: planned.name,
    sport_type: input.sportType || "baseball",
    field_status: "open",
    layout_role: planned.layoutRole,
    layout_type: planned.layoutType,
    surface_code: planned.surfaceCode,
    parent_field_id: parentId,
    is_demo: input.isDemo,
  };
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
    .insert({ name: input.organizationName.trim().slice(0, 160), slug, is_demo: input.isDemo })
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
      timezone: normalizeVenueTimezone(input.timezone),
      is_demo: input.isDemo,
    })
    .select("id,name")
    .single();
  if (venueError) {
    await unwind(org.id, null);
    throw new Error("Could not create the venue: " + venueError.message);
  }

  const planned = planFields(input);
  const plannedParents = planned.filter((f) => f.parentIndex === null);
  const plannedChildren = planned.filter((f) => f.parentIndex !== null);

  // Parents first: children carry parent_field_id, which needs real ids.
  const { data: parentRows, error: parentError } = await supabase
    .from("fields")
    .insert(plannedParents.map((f) => fieldRow(f, org.id, venue.id, input, null)))
    .select("id,name");
  if (parentError || !parentRows) {
    await unwind(org.id, venue.id);
    throw new Error("Could not create the fields (nothing was saved): " + (parentError?.message ?? "unknown error"));
  }

  // planFields guarantees parents are planned in order, so index maps to row.
  const parentIdByIndex = parentRows.map((r) => (r as { id: string }).id);

  let childRows: Array<{ id: string; name: string }> = [];
  if (plannedChildren.length > 0) {
    const { data, error } = await supabase
      .from("fields")
      .insert(plannedChildren.map((f) => fieldRow(f, org.id, venue.id, input, parentIdByIndex[f.parentIndex!])))
      .select("id,name");
    if (error || !data) {
      await unwind(org.id, venue.id);
      throw new Error("Could not create the split fields (nothing was saved): " + (error?.message ?? "unknown error"));
    }
    childRows = data as Array<{ id: string; name: string }>;
  }

  const allFields = [
    ...plannedParents.map((f, i) => ({ planned: f, id: parentIdByIndex[i], name: (parentRows[i] as { name: string }).name })),
    ...plannedChildren.map((f, i) => ({ planned: f, id: childRows[i]?.id, name: childRows[i]?.name ?? f.name })),
  ];

  // Play surfaces mirror the flagship's 1:1 shape: every field row gets a surface,
  // carrying the same parent/split_child role. Without these a provisioned venue is
  // structurally unlike every venue we demo.
  const { error: surfaceError } = await supabase.from("play_surfaces").insert(
    allFields.map((f, i) => ({
      organization_id: org.id,
      venue_id: venue.id,
      field_id: f.id,
      parent_field_id: f.planned.parentIndex === null ? null : parentIdByIndex[f.planned.parentIndex],
      name: f.name,
      surface_code: f.planned.surfaceCode,
      sport_types: [input.sportType || "baseball"],
      surface_type: surfaceTypeForSport(input.sportType),
      layout_role: f.planned.layoutRole,
      status: "open",
      sort_order: i,
    })),
  );
  if (surfaceError) {
    await unwind(org.id, venue.id);
    throw new Error("Could not create the play surfaces (nothing was saved): " + surfaceError.message);
  }

  // --- Technology ------------------------------------------------------------
  // venue_assets is the canonical device store: it is what the Command Center
  // reads for its device checks. (Devices were previously scattered across
  // `scoreboards`, `scoreboard_profiles`, `resources` and this table, and the two
  // the app read were empty platform-wide, so the Command Center's device
  // checklist could never go green for anyone.)
  //
  // Everything is registered with status "unknown": we are recording hardware the
  // venue told us about, not claiming it is installed and reporting. deviceCheck
  // renders that as "N registered, none reporting yet" rather than green.
  //
  // Failing to add a device row should not unwind a real customer's venue, so
  // hardware is best-effort and reported back honestly in the result.
  const deviceRows: Array<Record<string, unknown>> = [];

  if (input.technology.scoreboards) {
    // A board belongs to a playable surface. When a field is split, games happen
    // on the halves, so the halves get boards.
    const boardTargets = plannedChildren.length > 0 ? allFields.filter((f) => f.planned.parentIndex !== null) : allFields;
    for (const f of boardTargets) {
      deviceRows.push({
        organization_id: org.id,
        venue_id: venue.id,
        field_id: f.id,
        asset_name: `${f.name} Scoreboard`,
        asset_type: "scoreboard",
        asset_category: "scoreboards",
        status: "unknown",
        integration_status: "not_configured",
      });
    }
  }

  if (input.technology.cameras) {
    // Cameras cover the physical field, not each half.
    for (const f of allFields.filter((x) => x.planned.parentIndex === null)) {
      deviceRows.push({
        organization_id: org.id,
        venue_id: venue.id,
        field_id: f.id,
        asset_name: `${f.name} Camera`,
        asset_type: "camera",
        asset_category: "video",
        status: "unknown",
        integration_status: "not_configured",
      });
    }
  }

  if (input.technology.audio) {
    // The PA hardware itself is venue-wide.
    deviceRows.push({
      organization_id: org.id,
      venue_id: venue.id,
      asset_name: `${venue.name} PA`,
      asset_type: "speaker",
      asset_category: "audio",
      status: "unknown",
      integration_status: "not_configured",
    });
  }

  let scoreboardCount = 0;
  let cameraCount = 0;
  let audioCount = 0;
  if (deviceRows.length > 0) {
    const dynamic = supabase as unknown as DynamicProvisioningSupabase;
    const { data, error } = await dynamic.from("venue_assets").insert(deviceRows).select("id,asset_type");
    if (!error) {
      const created = (data ?? []) as Array<{ asset_type: string }>;
      scoreboardCount = created.filter((a) => a.asset_type === "scoreboard").length;
      cameraCount = created.filter((a) => a.asset_type === "camera").length;
      audioCount = created.filter((a) => a.asset_type === "speaker").length;
    }
  }

  // Audio POLICY, not hardware: if the venue told sales they run a house PA, that
  // is every playable field's default -- "when a game is played here, sound comes
  // from the venue PA". Without this the table would sit empty waiting for someone
  // to fill it in by hand, which is how audio_profiles ended up looking present
  // and doing nothing in the first place.
  //
  // Same targets as scoreboards: games are played on the split halves, so that is
  // where a profile belongs. status "not_configured" because nobody has verified
  // a speaker yet -- claiming "active" here would be the lie deviceCheck used to
  // tell.
  let audioProfileCount = 0;
  if (input.technology.audio) {
    const audioTargets = plannedChildren.length > 0 ? allFields.filter((f) => f.planned.parentIndex !== null) : allFields;
    const dynamic = supabase as unknown as DynamicProvisioningSupabase;
    const { data, error } = await dynamic
      .from("audio_profiles")
      .insert(audioTargets.map((f) => ({
        organization_id: org.id,
        venue_id: venue.id,
        field_id: f.id,
        session_id: null, // the field DEFAULT; per-game overrides come later
        audio_mode: "venue_pa",
        status: "not_configured",
        notes: "Created at onboarding — venue reported a house PA. Verify the speaker, then mark configured.",
      })))
      .select("id");
    if (!error) audioProfileCount = (data ?? []).length;
  }

  // --- League intent ---------------------------------------------------------
  // We record what sales promised; we do NOT create the team-app org. That org is
  // keyed to a real auth user (gdt_org_registry.owner_auth_user_id is NOT NULL),
  // which only exists once the owner accepts. See the migration for the full why.
  let leagueRequestId: string | null = null;
  if (input.accountType === "organization" && input.league) {
    const dynamic = supabase as unknown as DynamicProvisioningSupabase;
    const { data, error } = await dynamic
      .from("league_onboarding_requests")
      .insert({
        organization_id: org.id,
        venue_id: venue.id,
        league_name: input.league.leagueName.trim().slice(0, 160),
        team_count: Math.floor(input.league.teamCount),
        owner_email: input.league.ownerEmail.trim().toLowerCase().slice(0, 200),
        request_status: "pending",
        requested_by: ctx?.userId ?? null,
        is_demo: input.isDemo,
      })
      .select("id");
    if (error) {
      // The league IS the product for an organization. Silently dropping it would
      // hand sales a venue and lose the reason they sold it.
      await unwind(org.id, venue.id);
      throw new Error("Could not record the league request (nothing was saved): " + error.message);
    }
    leagueRequestId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null;
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
    fieldIds: allFields.map((f) => f.id).filter(Boolean),
    fieldNames: allFields.map((f) => f.name),
    playSurfaceCount: allFields.length,
    scoreboardCount,
    cameraCount,
    audioCount,
    audioProfileCount,
    leagueRequestId,
    planApplied,
    isDemo: input.isDemo,
  };
}

// --- Demo teardown -----------------------------------------------------------

export type DemoTenant = {
  organizationId: string;
  organizationName: string;
  venueId: string | null;
  venueName: string | null;
  fieldCount: number;
  createdAt: string;
};

export async function listDemoTenants(ctx: AccessContext | null): Promise<DemoTenant[]> {
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) {
    throw new Error("Only GameDay platform staff can view demo tenants.");
  }
  const supabase = getSupabaseAdminClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id,name,created_at")
    .eq("is_demo", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const tenants: DemoTenant[] = [];
  for (const org of orgs ?? []) {
    const row = org as { id: string; name: string; created_at: string };
    const { data: venues } = await supabase.from("venues").select("id,name").eq("organization_id", row.id).limit(1);
    const venue = (venues ?? [])[0] as { id: string; name: string } | undefined;
    const { count } = await supabase
      .from("fields")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", row.id);
    tenants.push({
      organizationId: row.id,
      organizationName: row.name,
      venueId: venue?.id ?? null,
      venueName: venue?.name ?? null,
      fieldCount: count ?? 0,
      createdAt: row.created_at,
    });
  }
  return tenants;
}

// Deletes a demo tenant and everything under it.
//
// The is_demo check is the guard and it is deliberately re-read from the database
// rather than trusted from the caller: a teardown that took an org id on faith
// would be one bad form post away from deleting a paying customer.
export async function teardownDemoTenant(organizationId: string, ctx: AccessContext | null): Promise<void> {
  if (!isPlatformAdmin(ctx) && !canManagePlatform(ctx)) {
    throw new Error("Only GameDay platform staff can tear down a demo.");
  }
  const supabase = getSupabaseAdminClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id,is_demo")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!org) throw new Error("That organization no longer exists.");
  if (!(org as { is_demo: boolean }).is_demo) {
    throw new Error("That organization is not a demo. Refusing to delete a real customer.");
  }

  const { data: venues } = await supabase.from("venues").select("id").eq("organization_id", organizationId);
  for (const venue of venues ?? []) {
    await unwind(organizationId, (venue as { id: string }).id);
  }
  // No venues (or already unwound): still remove the org itself.
  await unwind(organizationId, null);
}
