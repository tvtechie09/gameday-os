import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { canManageFields, isPlatformAdmin, type AccessContext } from "@/lib/access/capabilities";
import { assertFieldInScope } from "@/lib/access/scoped-venue-data";
import {
  expandGrantSlots,
  isClaimableSlot,
  resolveSlotStates,
  type ClaimLite,
  type GrantRecurrence,
  type ResolvedSlot,
} from "@/lib/services/field-reservations-core";

export * from "@/lib/services/field-reservations-core";

// Field reservations (IO). Grants (venue -> league) and slot claims (coach -> slot).
//
// field_block_grants / field_slot_claims are NOT in supabase/types.ts on purpose:
// adding tables to that Database type tips it past TypeScript's instantiation limit
// and collapses unrelated queries to `never` (measured: 343 errors from 24). Same
// narrow structural escape hatch used by provisioning.ts and venue-assets.ts.
type DynamicSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error: DbError }>;
      eq: (col: string, val: string) => {
        order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error: DbError }>;
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: DbError }>;
      };
    };
    insert: (rows: Record<string, unknown>) => {
      select: (columns: string) => { single: () => Promise<{ data: Record<string, unknown> | null; error: DbError }> };
    };
    update: (patch: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: DbError }> };
  };
};
type DbError = { code?: string; message?: string } | null;

function db(): DynamicSupabase {
  return getSupabaseAdminClient() as unknown as DynamicSupabase;
}

// ---- Domain types -----------------------------------------------------------

export type ClaimMode = "first_come" | "approval";
export type GrantStatus = "active" | "ended" | "cancelled";
export type ClaimStatus = "confirmed" | "requested" | "denied" | "cancelled";

export type BlockGrant = {
  id: string;
  fieldId: string;
  granteeOrganizationId: string | null;
  granteeName: string;
  claimMode: ClaimMode;
  recurrence: GrantRecurrence;
  status: GrantStatus;
  notes: string | null;
  isDemo: boolean;
};

export type SlotClaim = {
  id: string;
  grantId: string;
  fieldId: string;
  startsAt: string;
  endsAt: string;
  claimedByName: string;
  claimedByUserId: string | null;
  claimedByEmail: string | null;
  status: ClaimStatus;
  notes: string | null;
};

function mapGrant(row: Record<string, unknown>): BlockGrant {
  return {
    id: row.id as string,
    fieldId: row.field_id as string,
    granteeOrganizationId: (row.grantee_organization_id as string | null) ?? null,
    granteeName: row.grantee_name as string,
    claimMode: row.claim_mode as ClaimMode,
    recurrence: {
      daysOfWeek: (row.days_of_week as number[]) ?? [],
      windowStartMinute: row.window_start_minute as number,
      windowEndMinute: row.window_end_minute as number,
      slotMinutes: row.slot_minutes as number,
      seasonStartDate: row.season_start_date as string,
      seasonEndDate: row.season_end_date as string,
    },
    status: row.status as GrantStatus,
    notes: (row.notes as string | null) ?? null,
    isDemo: Boolean(row.is_demo),
  };
}

function mapClaim(row: Record<string, unknown>): SlotClaim {
  return {
    id: row.id as string,
    grantId: row.grant_id as string,
    fieldId: row.field_id as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    claimedByName: row.claimed_by_name as string,
    claimedByUserId: (row.claimed_by_user_id as string | null) ?? null,
    claimedByEmail: (row.claimed_by_email as string | null) ?? null,
    status: row.status as ClaimStatus,
    notes: (row.notes as string | null) ?? null,
  };
}

const GRANT_COLS = "id,field_id,grantee_organization_id,grantee_name,claim_mode,days_of_week,window_start_minute,window_end_minute,slot_minutes,season_start_date,season_end_date,status,notes,is_demo";
const CLAIM_COLS = "id,grant_id,field_id,starts_at,ends_at,claimed_by_name,claimed_by_user_id,claimed_by_email,status,notes";

// ---- Grants (venue -> league) ----------------------------------------------

function assertStaff(ctx: AccessContext | null): void {
  // Field allocation is a venue-operations action. Middleware already gates
  // /admin/fields/* on canManageFields; this is defense in depth for the actions.
  if (!isPlatformAdmin(ctx) && !canManageFields(ctx)) {
    throw new Error("You do not have permission to manage field reservations.");
  }
}

export async function listGrants(): Promise<BlockGrant[]> {
  const { data, error } = await db().from("field_block_grants").select(GRANT_COLS).order("created_at", { ascending: false });
  if (error) throw new Error(error.message ?? "Could not load grants.");
  return (data ?? []).map(mapGrant);
}

export async function getGrant(id: string): Promise<BlockGrant | null> {
  const { data, error } = await db().from("field_block_grants").select(GRANT_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message ?? "Could not load the grant.");
  return data ? mapGrant(data) : null;
}

// Read-only slice for the org-president console: the blocks THIS org has been
// granted, wherever they sit (the granting venue is often not owned by this
// org at all -- that's the whole point of a using org).
export async function listGrantsForOrganization(organizationId: string): Promise<BlockGrant[]> {
  const { data, error } = await db().from("field_block_grants").select(GRANT_COLS).eq("grantee_organization_id", organizationId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message ?? "Could not load grants.");
  return (data ?? []).map(mapGrant);
}

export type CreateGrantInput = {
  fieldId: string;
  granteeName: string;
  granteeOrganizationId?: string | null;
  claimMode: ClaimMode;
  recurrence: GrantRecurrence;
  notes?: string | null;
  isDemo?: boolean;
};

export function validateGrant(input: CreateGrantInput): { ok: true } | { ok: false; error: string } {
  const r = input.recurrence;
  if (!input.fieldId) return { ok: false, error: "Pick a field." };
  if (!input.granteeName?.trim()) return { ok: false, error: "Name the league or club receiving the block." };
  if (r.daysOfWeek.length === 0) return { ok: false, error: "Choose at least one day of the week." };
  if (r.windowEndMinute <= r.windowStartMinute) return { ok: false, error: "The window's end time must be after its start." };
  if (r.slotMinutes < 15) return { ok: false, error: "Slots must be at least 15 minutes." };
  if (r.slotMinutes > r.windowEndMinute - r.windowStartMinute) {
    return { ok: false, error: "A slot is longer than the daily window — nobody could claim it." };
  }
  if (r.seasonEndDate < r.seasonStartDate) return { ok: false, error: "The season's end date is before its start." };
  return { ok: true };
}

export async function createGrant(input: CreateGrantInput, ctx: AccessContext | null): Promise<BlockGrant> {
  assertStaff(ctx);
  const check = validateGrant(input);
  if (!check.ok) throw new Error(check.error);

  const r = input.recurrence;
  const { data, error } = await db().from("field_block_grants").insert({
    field_id: input.fieldId,
    grantee_organization_id: input.granteeOrganizationId ?? null,
    grantee_name: input.granteeName.trim().slice(0, 160),
    claim_mode: input.claimMode,
    days_of_week: r.daysOfWeek,
    window_start_minute: r.windowStartMinute,
    window_end_minute: r.windowEndMinute,
    slot_minutes: r.slotMinutes,
    season_start_date: r.seasonStartDate,
    season_end_date: r.seasonEndDate,
    notes: input.notes?.trim().slice(0, 500) || null,
    is_demo: input.isDemo ?? false,
    created_by: ctx?.userId ?? null,
  }).select(GRANT_COLS).single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the grant.");
  return mapGrant(data);
}

export async function setGrantStatus(id: string, status: GrantStatus, ctx: AccessContext | null): Promise<void> {
  assertStaff(ctx);
  const { error } = await db().from("field_block_grants").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message ?? "Could not update the grant.");
}

// ---- Claims (coach -> slot) -------------------------------------------------

export async function listClaimsForGrant(grantId: string): Promise<SlotClaim[]> {
  const { data, error } = await db().from("field_slot_claims").select(CLAIM_COLS).eq("grant_id", grantId).order("starts_at", { ascending: true });
  if (error) throw new Error(error.message ?? "Could not load claims.");
  return (data ?? []).map(mapClaim);
}

export async function getClaim(id: string): Promise<SlotClaim | null> {
  const { data, error } = await db().from("field_slot_claims").select(CLAIM_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message ?? "Could not load the claim.");
  return data ? mapClaim(data) : null;
}

// Every claim across every one of this org's grants -- the raw material for
// the coaches roster and for "which of our reservations are upcoming."
export async function listClaimsForOrganization(organizationId: string): Promise<SlotClaim[]> {
  const grants = await listGrantsForOrganization(organizationId);
  const claimLists = await Promise.all(grants.map((grant) => listClaimsForGrant(grant.id)));
  return claimLists.flat();
}

// Grant + every slot it offers in a window, each resolved for the viewer. The
// monitor (Phase 2) and the coach surface (Phase 3) both render from this.
export async function getGrantBoard(
  grantId: string,
  rangeStartMs: number,
  rangeEndMs: number,
  nowMs: number,
  viewerUserId: string | null,
): Promise<{ grant: BlockGrant; slots: ResolvedSlot[]; claims: SlotClaim[] } | null> {
  const grant = await getGrant(grantId);
  if (!grant) return null;
  const claims = await listClaimsForGrant(grantId);
  const slots = expandGrantSlots(grant.recurrence, rangeStartMs, rangeEndMs);
  const lite: ClaimLite[] = claims.map((c) => ({
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    status: c.status,
    claimedByName: c.claimedByName,
    claimedByUserId: c.claimedByUserId,
  }));
  return { grant, slots: resolveSlotStates(slots, lite, nowMs, viewerUserId), claims };
}

// Convenience for the monitor/coach pages: the grant board for the next `days`,
// with "now" captured here in the service rather than in a component render (the
// pure core still takes nowMs explicitly, so it stays testable).
export async function loadGrantBoard(grantId: string, viewerUserId: string | null, days = 14) {
  const now = Date.now();
  return getGrantBoard(grantId, now, now + days * 24 * 60 * 60 * 1000, now, viewerUserId);
}

export type ClaimSlotInput = {
  grantId: string;
  startsAt: string;
  endsAt: string;
  claimedByName: string;
  claimedByUserId?: string | null;
  claimedByEmail?: string | null;
  notes?: string | null;
};

export type ClaimResult =
  | { ok: true; claim: SlotClaim; mode: ClaimMode }
  | { ok: false; reason: "taken" | "invalid" | "closed" | "error"; message: string };

// The claim path. Validates the slot against the grant, then inserts. In
// first_come mode the row is born 'confirmed' and the DB exclusion constraint
// settles any race -- a caught exclusion_violation becomes reason "taken", the
// honest outcome ("someone grabbed it a moment before you"), never a 500.
export async function claimSlot(input: ClaimSlotInput): Promise<ClaimResult> {
  const grant = await getGrant(input.grantId);
  if (!grant) return { ok: false, reason: "invalid", message: "That block no longer exists." };
  if (grant.status !== "active") return { ok: false, reason: "closed", message: "This block is closed for new reservations." };
  if (!isClaimableSlot(grant.recurrence, input.startsAt, input.endsAt)) {
    return { ok: false, reason: "invalid", message: "That's not an open slot on this block." };
  }
  if (!input.claimedByName?.trim()) {
    return { ok: false, reason: "invalid", message: "Add the team name claiming the slot." };
  }

  const status: ClaimStatus = grant.claimMode === "approval" ? "requested" : "confirmed";
  const { data, error } = await db().from("field_slot_claims").insert({
    grant_id: grant.id,
    field_id: grant.fieldId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    claimed_by_name: input.claimedByName.trim().slice(0, 120),
    claimed_by_user_id: input.claimedByUserId ?? null,
    claimed_by_email: input.claimedByEmail?.trim().toLowerCase().slice(0, 254) || null,
    status,
    notes: input.notes?.trim().slice(0, 500) || null,
    is_demo: grant.isDemo,
  }).select(CLAIM_COLS).single();

  if (error) {
    // 23P01 = exclusion_violation: a confirmed claim already holds this slot.
    if (error.code === "23P01" || (error.message ?? "").includes("field_slot_claims_no_overlap")) {
      return { ok: false, reason: "taken", message: "That slot was just claimed by another team." };
    }
    return { ok: false, reason: "error", message: error.message ?? "Could not claim the slot." };
  }
  return { ok: true, claim: mapClaim(data!), mode: grant.claimMode };
}

async function assertCanCancelClaim(claim: SlotClaim, ctx: AccessContext | null): Promise<void> {
  if (isPlatformAdmin(ctx)) return;

  // Venue-staff override ("bump a coach"), but only for a field this caller
  // actually manages. canManageFields is a bare permission bit
  // (venue.manage/device.manage) -- organization_admin carries it regardless
  // of whether the org owns any venue, so it must be paired with
  // assertFieldInScope (venue-ownership aware) rather than trusted alone. If
  // it fails, fall through instead of rejecting outright: an org-scoped ctx
  // with venue.manage but no owned venue is exactly the using-org case, and
  // it may still be allowed below via its own grant.
  if (canManageFields(ctx)) {
    try {
      await assertFieldInScope(claim.fieldId);
      return;
    } catch {
      // not this caller's venue -- try the org-grant path below
    }
  }

  // The organization whose grant this claim belongs to, withdrawing its own
  // reservation. Anyone else -- including a different using-org -- is refused.
  if (ctx?.scopeType === "organization" && ctx.scopeId) {
    const grant = await getGrant(claim.grantId);
    if (grant?.granteeOrganizationId === ctx.scopeId) return;
  }

  throw new Error("You do not have permission to cancel this reservation.");
}

export async function cancelClaim(id: string, ctx: AccessContext | null): Promise<void> {
  const claim = await getClaim(id);
  if (!claim) throw new Error("That reservation no longer exists.");
  await assertCanCancelClaim(claim, ctx);
  const { error } = await db().from("field_slot_claims").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message ?? "Could not cancel the claim.");
}

// Approve a requested claim. Confirming it runs it against the exclusion
// constraint; if a confirmed claim already overlaps, the DB refuses and we report
// it rather than silently double-booking.
export async function approveClaim(id: string, ctx: AccessContext | null): Promise<{ ok: boolean; message?: string }> {
  assertStaff(ctx);
  const { error } = await db().from("field_slot_claims").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    if (error.code === "23P01" || (error.message ?? "").includes("field_slot_claims_no_overlap")) {
      return { ok: false, message: "Another team is already confirmed for that slot. Deny this one or cancel the other first." };
    }
    throw new Error(error.message ?? "Could not approve the claim.");
  }
  return { ok: true };
}

export async function denyClaim(id: string, ctx: AccessContext | null): Promise<void> {
  assertStaff(ctx);
  const { error } = await db().from("field_slot_claims").update({ status: "denied", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message ?? "Could not deny the claim.");
}
