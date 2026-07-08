import { AdminShell } from "@/components/admin-shell";
import { getCurrentScopeValue } from "@/lib/organization-scope";
import { getOrganizations } from "@/lib/services/organizations";
import { getScopeVenues } from "@/lib/services/venues";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [organizations, venues, selectedScope] = await Promise.all([
    getOrganizations().catch((error: unknown) => {
      console.error("Failed to load organizations for admin shell", error);
      return [];
    }),
    getScopeVenues().catch((error: unknown) => {
      console.error("Failed to load venues for admin shell", error);
      return [];
    }),
    getCurrentScopeValue(),
  ]);

  return (
    <AdminShell organizations={organizations} selectedScope={selectedScope} venues={venues}>
      {children}
    </AdminShell>
  );
}
