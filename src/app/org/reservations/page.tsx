import Link from "next/link";
import { redirect } from "next/navigation";
import { isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import { listGrantsForOrganization, listClaimsForGrant, timeLabel, type BlockGrant, type SlotClaim } from "@/lib/services/field-reservations";
import { cancelOwnClaimAction } from "./actions";
import { normalizeVenueTimezone } from "@/lib/venue-timezone";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function recurrenceLabel(grant: BlockGrant): string {
  const days = grant.recurrence.daysOfWeek.map((d) => DAY_LABELS[d]).join("/");
  const start = grant.recurrence.windowStartMinute;
  const end = grant.recurrence.windowEndMinute;
  const fmt = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${days || "No days set"}, ${fmt(start)}–${fmt(end)}`;
}

// An org can hold blocks at venues in different zones, so each block's rows read
// on that venue's own clock rather than one house clock for the whole page.
function claimDateLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone }).format(new Date(iso));
}

const statusStyle: Record<SlotClaim["status"], string> = {
  confirmed: "bg-emerald-500/15 text-emerald-700",
  requested: "bg-amber-500/20 text-amber-800",
  denied: "bg-red-500/15 text-red-700",
  cancelled: "bg-slate-500/10 text-slate-500 line-through",
};

export default async function OrgReservationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !isOrgScoped(ctx) || !ctx.scopeId) {
    redirect(getRoleHome(ctx));
  }
  const { error } = await searchParams;

  const [grants, allFields, allVenues] = await Promise.all([
    listGrantsForOrganization(ctx.scopeId).catch(() => []),
    getFields().catch(() => []),
    getVenues().catch(() => []),
  ]);
  const fieldsById = new Map(allFields.map((f) => [f.id, f]));
  const venuesById = new Map(allVenues.map((v) => [v.id, v]));

  const claimsByGrant = new Map<string, SlotClaim[]>();
  await Promise.all(
    grants.map(async (grant) => {
      const claims = await listClaimsForGrant(grant.id).catch(() => []);
      claimsByGrant.set(grant.id, claims);
    }),
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Organization</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Reservations</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Field blocks granted to your organization, and every reservation claimed against them. Cancel a claim your
            organization made if plans change — changing which fields you get, or requesting a new block, is a conversation
            with the venue.
          </p>
        </div>
        <Link href="/org" className="ui-button ui-button-secondary">
          Back
        </Link>
      </div>

      {error ? <p className="mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mt-8 grid gap-5">
        {grants.length === 0 ? (
          <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]">
            No field blocks have been granted to your organization yet.
          </p>
        ) : (
          grants.map((grant) => {
            const field = fieldsById.get(grant.fieldId);
            const venue = field?.venueId ? venuesById.get(field.venueId) : null;
            const claims = (claimsByGrant.get(grant.id) ?? []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
            // Every claim on a block sits on that block's field, so the grant's
            // venue is the right clock for all of its rows.
            const timeZone = normalizeVenueTimezone(venue?.timezone);
            return (
              <div key={grant.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">{field?.name ?? "Field"} {venue ? `— ${venue.name}` : ""}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{recurrenceLabel(grant)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${grant.status === "active" ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/10 text-slate-500"}`}>
                    {grant.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  {claims.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No reservations claimed on this block yet.</p>
                  ) : (
                    claims.map((claim) => (
                      <div key={claim.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--background)] px-4 py-3">
                        <div>
                          <p className="text-sm font-bold">
                            {claimDateLabel(claim.startsAt, timeZone)}, {timeLabel(claim.startsAt, timeZone)}–{timeLabel(claim.endsAt, timeZone)}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{claim.claimedByName}{claim.claimedByEmail ? ` · ${claim.claimedByEmail}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[claim.status]}`}>{claim.status}</span>
                          {claim.status === "confirmed" || claim.status === "requested" ? (
                            <form action={cancelOwnClaimAction}>
                              <input type="hidden" name="claim_id" value={claim.id} />
                              <button className="text-xs font-bold text-red-700 underline" type="submit">
                                Cancel
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
