import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Sponsor, SponsorAssignment, SponsorAssignmentType, SponsorPlacement, SponsorPlacementLabel } from "@/lib/types";
import { getCurrentOrganizationScope, getWritableOrganizationId } from "../organization-scope";
import { isSponsorCategory } from "./sponsor-category-core.ts";
import { getProhibitedCategoriesForVenue } from "./sponsor-policy.ts";
import { filterProhibitedPlacements } from "./sponsor-policy-core.ts";

type SponsorRow = Database["public"]["Tables"]["sponsors"]["Row"];
type SponsorAssignmentRow = Database["public"]["Tables"]["sponsor_assignments"]["Row"];

export type CreateSponsorInput = {
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  description?: string | null;
  category?: string | null;
};

export type UpdateSponsorInput = CreateSponsorInput;

export type CreateSponsorAssignmentInput = {
  sponsor_id: string;
  assignment_type: SponsorAssignmentType;
  venue_id?: string | null;
  field_id?: string | null;
  session_id?: string | null;
  placement_label: SponsorPlacementLabel;
};

const sponsorSelect = "id,organization_id,name,logo_url,website_url,description,category,created_at,updated_at";
const assignmentSelect = "id,sponsor_id,assignment_type,venue_id,field_id,session_id,placement_label,created_at,updated_at";
const validAssignmentTypes = ["venue", "field", "session"] as const;
const validPlacementLabels = ["Presented By", "Field Sponsor", "Game Sponsor", "Featured Sponsor"] as const;

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// An unrecognized category is stored as null rather than as-is: the whole point
// of the fixed vocabulary is that categories can be compared to each other, and a
// stray value would silently never match a conflict or policy check.
function readCategory(value: string | null | undefined) {
  const trimmed = value?.trim();
  return isSponsorCategory(trimmed) ? trimmed : null;
}

function readAssignmentType(value: string): SponsorAssignmentType {
  return validAssignmentTypes.find((type) => type === value) ?? "field";
}

function readPlacementLabel(value: string): SponsorPlacementLabel {
  return validPlacementLabels.find((label) => label === value) ?? "Featured Sponsor";
}

// website_url is NOT NULL with a '' default on this table, so "no website" is
// stored as the empty string and read back as null. Writing null instead would
// violate the constraint — which is how sponsor creation used to fail whenever
// the website field was left blank.
function mapSponsor(row: SponsorRow): Sponsor {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    name: row.name,
    logoUrl: readOptionalText(row.logo_url),
    websiteUrl: readOptionalText(row.website_url),
    description: row.description ?? "",
    category: row.category ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSponsorAssignment(row: SponsorAssignmentRow): SponsorAssignment {
  return {
    id: row.id,
    sponsorId: row.sponsor_id,
    assignmentType: readAssignmentType(row.assignment_type),
    venueId: row.venue_id,
    fieldId: row.field_id,
    sessionId: row.session_id,
    placementLabel: readPlacementLabel(row.placement_label),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSponsors(): Promise<Sponsor[]> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase.from("sponsors").select(sponsorSelect).order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSponsor);
}

export async function createSponsor(data: CreateSponsorInput): Promise<Sponsor> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getWritableOrganizationId();
  const { data: sponsor, error } = await supabase
    .from("sponsors")
    .insert({
      organization_id: organizationId,
      name: data.name,
      logo_url: readOptionalText(data.logo_url),
      website_url: readOptionalText(data.website_url) ?? "",
      description: readOptionalText(data.description),
      category: readCategory(data.category),
    })
    .select(sponsorSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSponsor(sponsor);
}

export async function getSponsor(id: string): Promise<Sponsor | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("sponsors").select(sponsorSelect).eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapSponsor(data) : null;
}

export async function updateSponsor(id: string, data: UpdateSponsorInput): Promise<Sponsor> {
  const supabase = getSupabaseAdminClient();
  const { data: sponsor, error } = await supabase
    .from("sponsors")
    .update({
      name: data.name,
      logo_url: readOptionalText(data.logo_url),
      website_url: readOptionalText(data.website_url) ?? "",
      description: readOptionalText(data.description),
      category: readCategory(data.category),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(sponsorSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSponsor(sponsor);
}

export async function deleteSponsor(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getSponsorAssignments(): Promise<SponsorAssignment[]> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getCurrentOrganizationScope();
  const { data, error } = await supabase.from("sponsor_assignments").select(assignmentSelect).order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const assignments = (data ?? []).map(mapSponsorAssignment);

  if (!organizationId) {
    return assignments;
  }

  const { data: sponsors, error: sponsorError } = await supabase.from("sponsors").select("id").eq("organization_id", organizationId);

  if (sponsorError) {
    throw new Error(sponsorError.message);
  }

  const sponsorIds = new Set((sponsors ?? []).map((sponsor) => sponsor.id));
  return assignments.filter((assignment) => sponsorIds.has(assignment.sponsorId));
}

export async function createSponsorAssignment(data: CreateSponsorAssignmentInput): Promise<SponsorAssignment> {
  const supabase = getSupabaseAdminClient();
  const target = {
    field_id: data.assignment_type === "field" ? readOptionalText(data.field_id) : null,
    session_id: data.assignment_type === "session" ? readOptionalText(data.session_id) : null,
    venue_id: data.assignment_type === "venue" ? readOptionalText(data.venue_id) : null,
  };

  if (data.assignment_type === "venue" && !target.venue_id) {
    throw new Error("Venue assignments require a venue.");
  }

  if (data.assignment_type === "field" && !target.field_id) {
    throw new Error("Field assignments require a field.");
  }

  if (data.assignment_type === "session" && !target.session_id) {
    throw new Error("Session assignments require a session.");
  }

  const assignment = {
    sponsor_id: data.sponsor_id,
    assignment_type: data.assignment_type,
    venue_id: target.venue_id,
    field_id: target.field_id,
    session_id: target.session_id,
    placement_label: data.placement_label,
  };

  const { data: createdAssignment, error } = await supabase
    .from("sponsor_assignments")
    .insert(assignment)
    .select(assignmentSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSponsorAssignment(createdAssignment);
}

export async function deleteSponsorAssignment(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("sponsor_assignments").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// The public surfaces call this. It returns ONLY what the venue's advertising
// policy allows — the safe result is the default result, so a new caller cannot
// leak a prohibited sponsor onto a family-facing page by forgetting a step.
// Use getSponsorPlacementsWithPolicy when you also need what was suppressed.
export async function getSponsorPlacementsForFieldPage(args: {
  venueId: string;
  fieldId: string;
  sessionId?: string | null;
}): Promise<SponsorPlacement[]> {
  const { visible } = await getSponsorPlacementsWithPolicy(args);
  return visible;
}

export async function getSponsorPlacementsWithPolicy({
  venueId,
  fieldId,
  sessionId,
}: {
  venueId: string;
  fieldId: string;
  sessionId?: string | null;
}): Promise<{ visible: SponsorPlacement[]; suppressed: SponsorPlacement[] }> {
  const supabase = getSupabaseAdminClient();
  const filters = [
    `and(assignment_type.eq.venue,venue_id.eq.${venueId})`,
    `and(assignment_type.eq.field,field_id.eq.${fieldId})`,
  ];

  if (sessionId) {
    filters.push(`and(assignment_type.eq.session,session_id.eq.${sessionId})`);
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("sponsor_assignments")
    .select(assignmentSelect)
    .or(filters.join(","))
    .order("created_at", { ascending: false });

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const sponsorIds = [...new Set((assignments ?? []).map((assignment) => assignment.sponsor_id))];

  if (sponsorIds.length === 0) {
    return { visible: [], suppressed: [] };
  }

  const { data: sponsors, error: sponsorError } = await supabase.from("sponsors").select(sponsorSelect).in("id", sponsorIds);

  if (sponsorError) {
    throw new Error(sponsorError.message);
  }

  const sponsorsById = new Map((sponsors ?? []).map((sponsor) => [sponsor.id, mapSponsor(sponsor)]));

  const placements = (assignments ?? []).flatMap((assignment) => {
    const sponsor = sponsorsById.get(assignment.sponsor_id);
    return sponsor ? [{ ...mapSponsorAssignment(assignment), sponsor }] : [];
  });

  const policy = await getProhibitedCategoriesForVenue(venueId);
  return filterProhibitedPlacements(placements, policy.categories);
}
