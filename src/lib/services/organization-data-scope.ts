import { getCurrentOrganizationScope } from "@/lib/organization-scope";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OrganizationDataScope = {
  fieldIds: Set<string>;
  sessionIds: Set<string>;
  venueIds: Set<string>;
};

export async function getOrganizationDataScope(): Promise<OrganizationDataScope | null> {
  const organizationId = await getCurrentOrganizationScope();

  if (!organizationId) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const [{ data: venues, error: venueError }, { data: fields, error: fieldError }, { data: sessions, error: sessionError }] = await Promise.all([
    supabase.from("venues").select("id").eq("organization_id", organizationId),
    supabase.from("fields").select("id,venue_id").eq("organization_id", organizationId),
    supabase.from("sessions").select("id").eq("organization_id", organizationId),
  ]);

  if (venueError) {
    throw new Error(venueError.message);
  }

  if (fieldError) {
    throw new Error(fieldError.message);
  }

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  return {
    fieldIds: new Set((fields ?? []).map((field) => field.id)),
    sessionIds: new Set((sessions ?? []).map((session) => session.id)),
    venueIds: new Set([
      ...(venues ?? []).map((venue) => venue.id),
      ...(fields ?? []).map((field) => field.venue_id),
    ]),
  };
}
