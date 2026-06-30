import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  IdentityFamily,
  IdentityFamilyMember,
  IdentityPerson,
  IdentityTeam,
  IdentityTeamMember,
  IdentityTeamSessionLink,
} from "@/lib/types";

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type DynamicSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<QueryResult<Record<string, unknown>>>;
    };
  };
};

function adminClient() {
  return getSupabaseAdminClient() as unknown as DynamicSupabase;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function bool(value: unknown) {
  return Boolean(value);
}

function mapPerson(row: Record<string, unknown>): IdentityPerson {
  return {
    createdAt: text(row.created_at),
    displayName: text(row.display_name),
    email: nullableText(row.email),
    id: text(row.id),
    notes: nullableText(row.notes),
    organizationId: nullableText(row.organization_id),
    personType: text(row.person_type, "other") as IdentityPerson["personType"],
    phone: nullableText(row.phone),
    updatedAt: text(row.updated_at),
    userId: nullableText(row.user_id),
  };
}

function mapFamily(row: Record<string, unknown>): IdentityFamily {
  return {
    createdAt: text(row.created_at),
    id: text(row.id),
    name: text(row.name),
    notes: nullableText(row.notes),
    organizationId: nullableText(row.organization_id),
    primaryContactPersonId: nullableText(row.primary_contact_person_id),
    updatedAt: text(row.updated_at),
  };
}

function mapFamilyMember(row: Record<string, unknown>): IdentityFamilyMember {
  return {
    createdAt: text(row.created_at),
    familyId: text(row.family_id),
    id: text(row.id),
    isPrimaryGuardian: bool(row.is_primary_guardian),
    organizationId: nullableText(row.organization_id),
    personId: text(row.person_id),
    relationship: text(row.relationship, "other") as IdentityFamilyMember["relationship"],
  };
}

function mapTeam(row: Record<string, unknown>): IdentityTeam {
  return {
    ageGroup: nullableText(row.age_group),
    createdAt: text(row.created_at),
    id: text(row.id),
    leagueId: nullableText(row.league_id),
    name: text(row.name),
    organizationId: nullableText(row.organization_id),
    seasonName: nullableText(row.season_name),
    sportType: text(row.sport_type, "baseball") as IdentityTeam["sportType"],
    status: text(row.status, "active") as IdentityTeam["status"],
    updatedAt: text(row.updated_at),
    venueId: nullableText(row.venue_id),
  };
}

function mapTeamMember(row: Record<string, unknown>): IdentityTeamMember {
  return {
    createdAt: text(row.created_at),
    id: text(row.id),
    organizationId: nullableText(row.organization_id),
    personId: text(row.person_id),
    roleType: text(row.role_type, "player") as IdentityTeamMember["roleType"],
    status: text(row.status, "active") as IdentityTeamMember["status"],
    teamId: text(row.team_id),
    updatedAt: text(row.updated_at),
  };
}

function mapTeamSessionLink(row: Record<string, unknown>): IdentityTeamSessionLink {
  return {
    createdAt: text(row.created_at),
    id: text(row.id),
    organizationId: nullableText(row.organization_id),
    relationshipType: text(row.relationship_type, "participant") as IdentityTeamSessionLink["relationshipType"],
    sessionId: text(row.session_id),
    teamId: text(row.team_id),
  };
}

async function loadTable<T>(table: string, select: string, orderBy: string, mapper: (row: Record<string, unknown>) => T): Promise<T[]> {
  const { data, error } = await adminClient().from(table).select(select).order(orderBy, { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapper);
}

export function getIdentityPeople(): Promise<IdentityPerson[]> {
  return loadTable("people", "id,organization_id,user_id,display_name,email,phone,person_type,notes,created_at,updated_at", "created_at", mapPerson);
}

export function getIdentityFamilies(): Promise<IdentityFamily[]> {
  return loadTable("families", "id,organization_id,name,primary_contact_person_id,notes,created_at,updated_at", "created_at", mapFamily);
}

export function getIdentityFamilyMembers(): Promise<IdentityFamilyMember[]> {
  return loadTable("family_members", "id,organization_id,family_id,person_id,relationship,is_primary_guardian,created_at", "created_at", mapFamilyMember);
}

export function getIdentityTeams(): Promise<IdentityTeam[]> {
  return loadTable("teams", "id,organization_id,venue_id,league_id,name,sport_type,age_group,season_name,status,created_at,updated_at", "created_at", mapTeam);
}

export function getIdentityTeamMembers(): Promise<IdentityTeamMember[]> {
  return loadTable("team_members", "id,organization_id,team_id,person_id,role_type,status,created_at,updated_at", "created_at", mapTeamMember);
}

export function getIdentityTeamSessionLinks(): Promise<IdentityTeamSessionLink[]> {
  return loadTable("team_session_links", "id,organization_id,team_id,session_id,relationship_type,created_at", "created_at", mapTeamSessionLink);
}
