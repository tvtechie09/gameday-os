import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Organization } from "@/lib/types";

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  logo_url?: string | null;
};

const organizationSelect = "id,name,slug,logo_url,created_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    createdAt: row.created_at,
    id: row.id,
    logoUrl: readOptionalText(row.logo_url),
    name: row.name,
    slug: row.slug,
  };
}

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(organizationSelect)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapOrganization);
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(organizationSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapOrganization(data) : null;
}

export async function createOrganization(data: CreateOrganizationInput): Promise<Organization> {
  const supabase = getSupabaseAdminClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .insert({
      logo_url: readOptionalText(data.logo_url),
      name: data.name,
      slug: data.slug,
    })
    .select(organizationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapOrganization(organization);
}

export async function getDefaultOrganizationId(): Promise<string | null> {
  const organizations = await getOrganizations();
  return organizations[0]?.id ?? null;
}
