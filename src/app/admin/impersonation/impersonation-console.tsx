"use client";

import { useMemo, useState } from "react";

export type VenueOption = {
  id: string;
  name: string;
  location: string | null;
  statusLabel: string | null;
};

export type RoleOption = {
  key: string;
  name: string;
  description: string | null;
};

export type RoleGroup = {
  label: string;
  venueAgnostic: boolean;
  roles: RoleOption[];
};

// Client console: pick ANY venue + ANY role and preview the app as that
// combination. Posts the selection to /api/dev-login/impersonate, which stores a
// synthetic-session cookie (no fake user) and redirects to /today.
export function ImpersonationConsole({
  venues,
  roleGroups,
}: Readonly<{ venues: VenueOption[]; roleGroups: RoleGroup[] }>) {
  const [roleKey, setRoleKey] = useState("");
  const [venueId, setVenueId] = useState("");

  const rolesByKey = useMemo(() => {
    const map = new Map<string, { role: RoleOption; venueAgnostic: boolean }>();
    for (const group of roleGroups) {
      for (const role of group.roles) {
        map.set(role.key, { role, venueAgnostic: group.venueAgnostic });
      }
    }
    return map;
  }, [roleGroups]);

  const selected = roleKey ? rolesByKey.get(roleKey) : undefined;
  const venueAgnostic = selected?.venueAgnostic ?? false;
  const selectedVenue = venues.find((v) => v.id === venueId) ?? null;

  const needsVenue = Boolean(selected) && !venueAgnostic && !venueId;
  const canSubmit = Boolean(selected) && (venueAgnostic || Boolean(venueId));

  const cta = useMemo(() => {
    if (!selected) {
      return "Select a role to preview";
    }
    if (venueAgnostic) {
      return `View as ${selected.role.name} (platform)`;
    }
    if (selectedVenue) {
      return `View as ${selected.role.name} at ${selectedVenue.name}`;
    }
    return `View as ${selected.role.name}`;
  }, [selected, venueAgnostic, selectedVenue]);

  return (
    <form action="/api/dev-login/impersonate" method="post" className="mt-6 grid gap-5">
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

      <div className="grid gap-2">
        <label htmlFor="roleKey" className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">
          Role
        </label>
        <select
          id="roleKey"
          name="roleKey"
          value={roleKey}
          onChange={(event) => {
            const nextKey = event.target.value;
            setRoleKey(nextKey);
            const next = rolesByKey.get(nextKey);
            if (next?.venueAgnostic) {
              setVenueId("");
            }
          }}
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-[var(--foreground)]"
        >
          <option value="">Select a role…</option>
          {roleGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {selected?.role.description ? (
          <p className="text-xs leading-5 text-[var(--muted)]">{selected.role.description}</p>
        ) : null}
      </div>

      {needsVenue ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">
          Select a venue to preview this role.
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
