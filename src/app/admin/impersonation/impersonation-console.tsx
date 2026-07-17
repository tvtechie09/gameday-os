"use client";

import { useMemo, useState } from "react";

export type VenueOption = {
  id: string;
  name: string;
  location: string | null;
  statusLabel: string | null;
};

export type OrgOption = {
  id: string;
  name: string;
};

export type RoleOption = {
  key: string;
  name: string;
  description: string | null;
};

export type RoleGroup = {
  label: string;
  venueAgnostic: boolean;
  // Org-scoped roles (a president) preview AS a specific organization — they need
  // an org, not a venue.
  orgScoped: boolean;
  roles: RoleOption[];
};

// Client console: pick ANY venue + ANY role and preview the app as that
// combination. Posts the selection to /api/dev-login/impersonate, which stores a
// synthetic-session cookie (no fake user) and redirects to /today.
export function ImpersonationConsole({
  venues,
  organizations,
  roleGroups,
}: Readonly<{ venues: VenueOption[]; organizations: OrgOption[]; roleGroups: RoleGroup[] }>) {
  const [roleKey, setRoleKey] = useState("");
  const [venueId, setVenueId] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  const rolesByKey = useMemo(() => {
    const map = new Map<string, { role: RoleOption; venueAgnostic: boolean; orgScoped: boolean }>();
    for (const group of roleGroups) {
      for (const role of group.roles) {
        map.set(role.key, { role, venueAgnostic: group.venueAgnostic, orgScoped: group.orgScoped });
      }
    }
    return map;
  }, [roleGroups]);

  const selected = roleKey ? rolesByKey.get(roleKey) : undefined;
  const orgScoped = selected?.orgScoped ?? false;
  const venueAgnostic = selected?.venueAgnostic ?? false;
  const selectedVenue = venues.find((v) => v.id === venueId) ?? null;
  const selectedOrg = organizations.find((o) => o.id === organizationId) ?? null;

  const needsVenue = Boolean(selected) && !venueAgnostic && !orgScoped && !venueId;
  const needsOrg = Boolean(selected) && orgScoped && !organizationId;
  const canSubmit = Boolean(selected) && (orgScoped ? Boolean(organizationId) : venueAgnostic || Boolean(venueId));

  const cta = useMemo(() => {
    if (!selected) {
      return "Select a role to preview";
    }
    if (orgScoped) {
      return selectedOrg ? `View as ${selected.role.name} of ${selectedOrg.name}` : `View as ${selected.role.name}`;
    }
    if (venueAgnostic) {
      return `View as ${selected.role.name} (platform)`;
    }
    if (selectedVenue) {
      return `View as ${selected.role.name} at ${selectedVenue.name}`;
    }
    return `View as ${selected.role.name}`;
  }, [selected, orgScoped, venueAgnostic, selectedVenue, selectedOrg]);

  return (
    <form action="/api/dev-login/impersonate" method="post" className="mt-6 grid gap-5">
      {orgScoped ? (
        <div className="grid gap-2">
          <label htmlFor="organizationId" className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">
            Organization
          </label>
          <select
            id="organizationId"
            name="organizationId"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-[var(--foreground)]"
          >
            <option value="">Select an organization…</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <p className="text-xs font-semibold text-[var(--muted)]">
            Preview as this organization&rsquo;s president — including orgs that use fields they don&rsquo;t own.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <label htmlFor="venueId" className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">
            Venue
          </label>
          <select
            id="venueId"
            name="venueId"
            value={venueId}
            onChange={(event) => setVenueId(event.target.value)}
            disabled={venueAgnostic}
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{venueAgnostic ? "Not required for this role" : "Select a venue…"}</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
                {venue.location ? ` — ${venue.location}` : ""}
                {venue.statusLabel ? ` (${venue.statusLabel})` : ""}
              </option>
            ))}
          </select>
          {venueAgnostic ? (
            <p className="text-xs font-semibold text-[var(--muted)]">
              This role is platform-wide and is previewed without a specific venue.
            </p>
          ) : null}
        </div>
      )}

      <div className="grid gap-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Role</p>
        <input type="hidden" name="roleKey" value={roleKey} />
        {roleGroups.map((group) => (
          <div key={group.label} className="grid gap-2">
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{group.label}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.roles.map((role) => {
                const active = roleKey === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setRoleKey(role.key);
                      // Scopes are mutually exclusive; clear the one that no longer applies.
                      if (group.venueAgnostic || group.orgScoped) setVenueId("");
                      if (!group.orgScoped) setOrganizationId("");
                    }}
                    className={`grid gap-1 rounded-lg border p-3 text-left transition ${active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"}`}
                  >
                    <span className="text-sm font-black">{role.name}</span>
                    {role.description ? <span className="text-xs leading-5 text-[var(--muted)]">{role.description}</span> : null}
                    {group.venueAgnostic ? <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent-strong)]">Platform-wide</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {needsVenue ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">
          Select a venue to preview this role.
        </p>
      ) : null}
      {needsOrg ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">
          Select an organization to preview this role.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="min-h-11 w-full rounded-lg bg-[var(--black-soft)] px-3 py-2 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {cta}
      </button>
    </form>
  );
}
