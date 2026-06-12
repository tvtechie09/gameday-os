import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Sponsor, SponsorAssignment, SponsorAssignmentType, SponsorPlacement, SponsorPlacementLabel } from "@/lib/types";

type SponsorRow = Database["public"]["Tables"]["sponsors"]["Row"];
type SponsorAssignmentRow = Database["public"]["Tables"]["sponsor_assignments"]["Row"];

export type CreateSponsorInput = {
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  description?: string | null;
};

export type CreateSponsorAssignmentInput = {
  sponsor_id: string;
  assignment_type: SponsorAssignmentType;
  venue_id?: string | null;
  field_id?: string | null;
  session_id?: string | null;
  placement_label: SponsorPlacementLabel;
};

const sponsorSelect = "id,name,logo_url,website_url,description,created_at,updated_at";
const assignmentSelect = "id,sponsor_id,assignment_type,venue_id,field_id,session_id,placement_label,created_at,updated_at";
const validAssignmentTypes = ["venue", "field", "session"] as const;
const validPlacementLabels = ["Presented By", "Field Sponsor", "Game Sponsor", "Featured Sponsor"] as const;

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readAssignmentType(value: string): SponsorAssignmentType {
  return validAssignmentTypes.find((type) => type === value) ?? "field";
}

function readPlacementLabel(value: string): SponsorPlacementLabel {
  return validPlacementLabels.find((label) => label === value) ?? "Featured Sponsor";
}

function mapSponsor(row: SponsorRow): Sponsor {
  return {
    id: row.id,
    name: row.name,
    logoUrl: readOptionalText(row.logo_url),
    websiteUrl: readOptionalText(row.website_url),
    description: row.description ?? "",
    createdAt: row.created_at,
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
  };
}

export async function getSponsors(): Promise<Sponsor[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("sponsors").select(sponsorSelect).order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSponsor);
}

export async function createSponsor(data: CreateSponsorInput): Promise<Sponsor> {
  const supabase = getSupabaseAdminClient();
  const { data: sponsor, error } = await supabase
    .from("sponsors")
    .insert({
      name: data.name,
      logo_url: readOptionalText(data.logo_url),
      website_url: readOptionalText(data.website_url),
      description: readOptionalText(data.description),
    })
    .select(sponsorSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSponsor(sponsor);
}

export async function getSponsorAssignments(): Promise<SponsorAssignment[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("sponsor_assignments").select(assignmentSelect).order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSponsorAssignment);
}

export async function createSponsorAssignment(data: CreateSponsorAssignmentInput): Promise<SponsorAssignment> {
  const supabase = getSupabaseAdminClient();
  const assignment = {
    sponsor_id: data.sponsor_id,
    assignment_type: data.assignment_type,
    venue_id: data.assignment_type === "venue" ? data.venue_id : null,
    field_id: data.assignment_type === "field" ? data.field_id : null,
    session_id: data.assignment_type === "session" ? data.session_id : null,
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

export async function getSponsorPlacementsForFieldPage({
  venueId,
  fieldId,
  sessionId,
}: {
  venueId: string;
  fieldId: string;
  sessionId?: string | null;
}): Promise<SponsorPlacement[]> {
  const supabase = getSupabaseServerClient();
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
    return [];
  }

  const { data: sponsors, error: sponsorError } = await supabase.from("sponsors").select(sponsorSelect).in("id", sponsorIds);

  if (sponsorError) {
    throw new Error(sponsorError.message);
  }

  const sponsorsById = new Map((sponsors ?? []).map((sponsor) => [sponsor.id, mapSponsor(sponsor)]));

  return (assignments ?? []).flatMap((assignment) => {
    const sponsor = sponsorsById.get(assignment.sponsor_id);
    return sponsor ? [{ ...mapSponsorAssignment(assignment), sponsor }] : [];
  });
}
