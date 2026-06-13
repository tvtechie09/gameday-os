import { AdminShell } from "@/components/admin-shell";
import { allOrganizationsScope, getCurrentOrganizationScope } from "@/lib/organization-scope";
import { getOrganizations } from "@/lib/services/organizations";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [organizations, selectedOrganizationId] = await Promise.all([
    getOrganizations().catch((error: unknown) => {
      console.error("Failed to load organizations for admin shell", error);
      return [];
    }),
    getCurrentOrganizationScope(),
  ]);

  return (
    <AdminShell
      organizations={organizations}
      selectedOrganizationId={selectedOrganizationId ?? allOrganizationsScope}
    >
      {children}
    </AdminShell>
  );
}
