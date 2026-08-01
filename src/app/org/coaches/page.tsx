import Link from "next/link";
import { redirect } from "next/navigation";
import { isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { deriveCoachRoster, listClaimsForOrganization } from "@/lib/services/field-reservations";
import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import { normalizeVenueTimezone } from "@/lib/venue-timezone";

export const dynamic = "force-dynamic";

// A coach can hold slots at venues in different zones, so "last claimed" is read
// in the zone of the venue that claim was actually made at, not one house clock.
function dateLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(iso));
}

export default async function OrgCoachesPage() {
  const ctx = await getSessionContext();
  if (!ctx || !isOrgScoped(ctx) || !ctx.scopeId) {
    redirect(getRoleHome(ctx));
  }

  const [claims, allFields, allVenues] = await Promise.all([
    listClaimsForOrganization(ctx.scopeId).catch(() => []),
    getFields().catch(() => []),
    getVenues().catch(() => []),
  ]);
  const roster = deriveCoachRoster(claims);

  // field -> venue -> zone, so each row can be dated on its own venue's clock.
  const venueTimeZoneById = new Map(allVenues.map((v) => [v.id, v.timezone]));
  const fieldTimeZoneById = new Map(allFields.map((f) => [f.id, venueTimeZoneById.get(f.venueId)]));
  const timeZoneForField = (fieldId: string) => normalizeVenueTimezone(fieldTimeZoneById.get(fieldId));

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Organization</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Coaches</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            There&apos;s no separate coach roster to maintain — this is built from who has claimed a reservation on one of your
            organization&apos;s field blocks. Someone appears here the first time they claim a slot.
          </p>
        </div>
        <Link href="/org" className="ui-button ui-button-secondary">
          Back
        </Link>
      </div>

      <div className="mt-8 grid gap-3">
        {roster.length === 0 ? (
          <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]">
            No one has claimed a reservation yet.
          </p>
        ) : (
          roster.map((coach) => (
            <div key={coach.name + coach.email} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-4">
              <div>
                <p className="text-sm font-bold">{coach.name}</p>
                {coach.email ? <p className="text-xs text-[var(--muted)]">{coach.email}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{coach.activeClaimCount} active reservation{coach.activeClaimCount === 1 ? "" : "s"}</p>
                <p className="text-xs text-[var(--muted)]">Last claimed {dateLabel(coach.lastClaimAt, timeZoneForField(coach.lastClaimFieldId))}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
