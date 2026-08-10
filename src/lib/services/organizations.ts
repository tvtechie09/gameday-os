import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Organization } from "@/lib/types";

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  logo_url?: string | null;
  banner_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  website_url?: string | null;
  description?: string | null;
};

export type UpdateOrganizationInput = CreateOrganizationInput;

const organizationSelect = "id,name,slug,logo_url,banner_url,primary_color,secondary_color,website_url,description,created_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// The branding columns are guaranteed by
// supabase/migrations/20260810000000_organization_branding_columns.sql.
//
// There used to be a fallback here that caught "column does not exist" on read
// and retried without them. It hid a real outage: the columns had never been
// created, so creating or editing an organization failed outright, while the
// list page degraded quietly to un-branded rows and looked merely empty. A
// missing column is a deployment fault, and it should surface as one.
function mapOrganization(row: OrganizationRow): Organization {
  return {
    createdAt: row.created_at,
    id: row.id,
    logoUrl: readOptionalText(row.logo_url),
    bannerUrl: readOptionalText(row.banner_url),
    primaryColor: readOptionalText(row.primary_color),
    secondaryColor: readOptionalText(row.secondary_color),
    websiteUrl: readOptionalText(row.website_url),
    description: row.description ?? "",
    name: row.name,
    slug: row.slug,
  };
}

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = getSupabaseAdminClient();
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
  const supabase = getSupabaseAdminClient();
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
      banner_url: readOptionalText(data.banner_url),
      description: readOptionalText(data.description),
      logo_url: readOptionalText(data.logo_url),
      name: data.name,
      primary_color: readOptionalText(data.primary_color),
      secondary_color: readOptionalText(data.secondary_color),
      slug: data.slug,
      website_url: readOptionalText(data.website_url),
    })
    .select(organizationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapOrganization(organization);
}

export async function updateOrganization(id: string, data: UpdateOrganizationInput): Promise<Organization> {
  const supabase = getSupabaseAdminClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .update({
      banner_url: readOptionalText(data.banner_url),
      description: readOptionalText(data.description),
      logo_url: readOptionalText(data.logo_url),
      name: data.name,
      primary_color: readOptionalText(data.primary_color),
      secondary_color: readOptionalText(data.secondary_color),
      slug: data.slug,
      website_url: readOptionalText(data.website_url),
    })
    .eq("id", id)
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
