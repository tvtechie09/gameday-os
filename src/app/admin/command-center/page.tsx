import { redirect } from "next/navigation";
import { canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";

type LegacyCommandCenterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// UI/UX 1.1C retired the duplicate aggregate board. Keep the bookmark working
// and preserve ordinary query context while sending operators to the canonical
// chronological day-of surface.
export default async function LegacyCommandCenterPage({ searchParams }: LegacyCommandCenterPageProps) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved ?? {})) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  redirect(`/today${params.size > 0 ? `?${params.toString()}` : ""}`);
}
