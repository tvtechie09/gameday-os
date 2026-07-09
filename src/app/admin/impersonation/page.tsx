import { redirect } from "next/navigation";
import { canImpersonate } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getActingContext } from "@/lib/access/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ImpersonationConsole,
  type RoleGroup,
  type RoleOption,
  type VenueOption,
} from "./impersonation-console";

export const dynamic = "force-dynamic";

// Grouping of role keys for the selector. Any DB role not listed here falls into
// "Other roles". `venueAgnostic` groups are previewed at platform scope (no
// venue required).
const roleGroupSpec: Array<{ label: string; venueAgnostic: boolean; keys: string[] }> = [
  {
    label: "Platform / tenant (no venue required)",
    venueAgnostic: true,
    keys: ["super_admin", "platform_admin", "organization_admin"],
  },
  {
    label: "Venue operations",
    venueAgnostic: false,
    keys: ["venue_director", "venue_staff", "venue_tech_manager"],
  },
  {
    label: "Tournament",
    venueAgnostic: false,
    keys: ["tournament_director", "tournament_staff"],
  },
  {
    label: "Game ops",
    venueAgnostic: false,
    keys: ["scorekeeper", "livestream_operator", "stream_operator", "media_operator"],
  },
  {
    label: "League",
    venueAgnostic: false,
    keys: ["league_director", "league_staff", "coach", "team_manager"],
  },
  {
    label: "Safety / compliance",
    venueAgnostic: false,
    keys: ["emergency_coordinator", "audit_reviewer", "read_only", "sponsor_manager"],
  },
  {
    label: "Fans & partners",
    venueAgnostic: false,
    keys: ["parent", "player", "fan", "third_party_developer"],
  },
];

// Nicer venue GM label without depending on the DB name.
const roleLabelOverrides: Record<string, string> = {
  venue_director: "Venue GM / Venue Director",
};

function venueLocation(city: string | null, state: string | null): string | null {
  const parts = [city, state].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length > 0 ? parts.join(", ") : null;
}

function venueStatusLabel(status: string | null): string | null {
  if (!status) {
    return null;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

async function loadVenues(): Promise<VenueOption[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from("venues")
      .select("id,name,city,state,status")
      .order("name", { ascending: true });
    return (data ?? []).map((venue) => ({
      id: venue.id,
      name: venue.name,
      location: venueLocation(venue.city, venue.state),
      statusLabel: venueStatusLabel(venue.status),
    }));
  } catch {
    return [];
  }
}

async function loadRoleGroups(): Promise<RoleGroup[]> {
  let roles: Array<{ key: string; name: string; description: string | null }> = [];
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase.from("roles").select("key,name,description").order("name", { ascending: true });
    roles = data ?? [];
  } catch {
    roles = [];
  }

  const rolesByKey = new Map(roles.map((role) => [role.key, role]));
  const grouped: RoleGroup[] = [];
  const usedKeys = new Set<string>();

  const toOption = (key: string): RoleOption | null => {
    const role = rolesByKey.get(key);
    if (!role) {
      return null;
    }
    usedKeys.add(key);
    return {
      key: role.key,
      name: roleLabelOverrides[role.key] ?? role.name,
      description: role.description,
    };
  };

  for (const spec of roleGroupSpec) {
    const options = spec.keys.map(toOption).filter((option): option is RoleOption => option !== null);
    if (options.length > 0) {
      grouped.push({ label: spec.label, venueAgnostic: spec.venueAgnostic, roles: options });
    }
  }

  const leftover = roles
    .filter((role) => !usedKeys.has(role.key))
    .map((role) => ({ key: role.key, name: role.name, description: role.description }));
  if (leftover.length > 0) {
    grouped.push({ label: "Other roles", venueAgnostic: false, roles: leftover });
  }

  return grouped;
}

// Admin-only impersonation console. Guarded on the REAL acting user's
// canImpersonate capability (super_admin) — resolved while ignoring any active
// preview so a low-permission preview can never lock the admin out of this page.
export default async function ImpersonationPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const ctx = await getActingContext();
  if (!ctx || !canImpersonate(ctx)) {
    redirect(getRoleHome(ctx));
  }

  const params = await searchParams;
  const [venues, roleGroups] = await Promise.all([loadVenues(), loadRoleGroups()]);

  const errorMessage =
    params.error === "missing-venue"
      ? "Select a venue to preview that role."
      : params.error === "missing-role"
        ? "Select a role to preview."
        : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Admin · Access</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Impersonation</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Select any venue and any role to preview the app exactly as that combination sees it. Your real admin session is
          preserved and a persistent banner lets you exit at any time.
        </p>
      </header>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {errorMessage}
        </p>
      ) : null}

      {venues.length === 0 || roleGroups.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          Unable to load venues or roles. Check the Supabase connection and try again.
        </p>
      ) : (
        <ImpersonationConsole venues={venues} roleGroups={roleGroups} />
      )}
    </div>
  );
}
