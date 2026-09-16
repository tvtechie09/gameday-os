import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { RoleAssignment, RoleType } from "@/lib/types";
import { getCurrentOrganizationScope } from "../organization-scope";

type RoleAssignmentRow = Database["public"]["Tables"]["role_assignments"]["Row"];

export const roleTypes: RoleType[] = ["super_admin", "organization_admin", "field_operator", "volunteer", "read_only"];

export const roleLabels: Record<RoleType, string> = {
  field_operator: "Field Operator",
  organization_admin: "Organization Admin",
  read_only: "Read Only",
  super_admin: "Super Admin",
  volunteer: "Volunteer",
};

export const permissionMatrix: Array<{
  area: string;
  pages: string[];
  access: Record<RoleType, string>;
}> = [
  {
    area: "Organization Management",
    pages: ["/admin/organizations", "/admin/organizations/branding", "/admin/roles"],
    access: {
      super_admin: "Full access across organizations",
      organization_admin: "Manage own organization",
      field_operator: "No access",
      volunteer: "No access",
      read_only: "View only",
    },
  },
  {
    area: "Venue Operations",
    pages: ["/admin", "/today", "/admin/fields", "/admin/operations-center", "/admin/venues"],
    access: {
      super_admin: "Full access",
      organization_admin: "Full access for own organization",
      field_operator: "Operate assigned fields",
      volunteer: "Limited field view",
      read_only: "View only",
    },
  },
  {
    area: "Games & Sessions",
    pages: ["/admin/sessions", "/admin/sessions/[sessionId]", "/admin/sessions/bulk", "/admin/tournaments"],
    access: {
      super_admin: "Full access",
      organization_admin: "Full access for own organization",
      field_operator: "Update live games",
      volunteer: "Assist assigned sessions",
      read_only: "View only",
    },
  },
  {
    area: "Engagement",
    pages: ["/admin/sponsors", "/admin/alerts", "/admin/notifications", "/admin/volunteers"],
    access: {
      super_admin: "Full access",
      organization_admin: "Manage engagement",
      field_operator: "Create operational alerts",
      volunteer: "Volunteer requests only",
      read_only: "View only",
    },
  },
  {
    area: "Resources",
    pages: ["/admin/resources", "/admin/resources/dashboard", "/admin/resources/activations"],
    access: {
      super_admin: "Full access",
      organization_admin: "Manage resources",
      field_operator: "Approve and end active resources",
      volunteer: "Request resources",
      read_only: "View only",
    },
  },
  {
    area: "Integrations & Tools",
    pages: ["/admin/integrations", "/admin/sync", "/admin/schema-audit", "/admin/import"],
    access: {
      super_admin: "Full access",
      organization_admin: "Manage imports for own organization",
      field_operator: "No access",
      volunteer: "No access",
      read_only: "View only",
    },
  },
];

const roleAssignmentSelect = "id,organization_id,role_type,display_name,email,created_at";

function readRoleType(value: string): RoleType {
  return roleTypes.find((roleType) => roleType === value) ?? "read_only";
}

function mapRoleAssignment(row: RoleAssignmentRow): RoleAssignment {
  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    organizationId: row.organization_id,
    roleType: readRoleType(row.role_type),
  };
}

export async function getRoleAssignments(): Promise<RoleAssignment[]> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase
    .from("role_assignments")
    .select(roleAssignmentSelect)
    .order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRoleAssignment);
}
