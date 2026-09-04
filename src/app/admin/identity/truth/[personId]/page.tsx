import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canReviewIdentities } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { projectionStatusLabel } from "@/lib/platform-identity-review";
import { truthProviderLabel, truthReasonExplanations, type TruthReasonCode } from "@/lib/platform-identity-truth";
import { getPlatformPersonTruth } from "@/lib/services/platform-identity-truth";
import { getOrganization } from "@/lib/services/organizations";
import { retryTruthProjectionAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ organizationId?: string; result?: string }>;
};

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value == null ? "Needs review" : JSON.stringify(value);
}

function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "Date unavailable";
}

export default async function PlatformIdentityTruthPage({ params, searchParams }: Props) {
  const [{ personId }, query] = await Promise.all([params, searchParams]);
  const ctx = await getSessionContext();
  if (!ctx || !canReviewIdentities(ctx)) redirect(getRoleHome(ctx));
  if (!query.organizationId) notFound();
  const [truth, organization] = await Promise.all([
    getPlatformPersonTruth(query.organizationId, personId).catch(() => null),
    getOrganization(query.organizationId).catch(() => null),
  ]);
  if (!truth) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="text-sm font-bold text-[var(--accent-strong)] underline" href={"/admin/identity/review?organizationId=" + encodeURIComponent(query.organizationId)}>Back to Identity Review</Link>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">GameDay Truth</p>
      <h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">{truth.person.displayName}</h1>
      <p className="mt-2 text-sm font-semibold text-[var(--muted)]">What GameDay currently uses, where it came from, and why · {organization?.name ?? "Authorized organization"}</p>
      {query.result ? <p aria-live="polite" className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-4 font-semibold">{query.result === "retry-failed" ? "Projection retry could not be completed. Canonical Truth was not changed." : "Projection retry requested. Canonical Truth did not change."}</p> : null}

      {truth.reviewCases.length > 0 ? <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-slate-950">
        <h2 className="text-xl font-black">Identity needs review</h2>
        <p className="mt-2 text-sm leading-6">GameDay has not confirmed whether one or more source records belong to this person. Their assertions are not presented here as canonical facts.</p>
        <Link className="ui-button ui-button-secondary mt-4" href={"/admin/identity/review/" + truth.reviewCases[0].caseId + "?organizationId=" + encodeURIComponent(query.organizationId)}>Review Identity</Link>
      </section> : null}

      <section className="mt-8" aria-labelledby="current-values-heading">
        <h2 id="current-values-heading" className="text-2xl font-black">Current values</h2>
        {truth.fields.length === 0 ? <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5"><h3 className="font-black">No source available</h3><p className="mt-2 text-sm text-[var(--muted)]">No active, supported identity assertion is linked to this person.</p></div> : <div className="mt-4 grid gap-4 md:grid-cols-2">
          {truth.fields.map((field) => {
            const explanation = truthReasonExplanations[field.reasonCode as TruthReasonCode] ?? "GameDay selected this value using the configured field authority policy.";
            return <article className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-5" key={field.domain + "." + field.key}>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{field.label}</p>
              <h3 className="mt-2 break-words text-2xl font-black">{displayValue(field.effectiveValue)}</h3>
              <p className="mt-2 text-sm"><strong>Source:</strong> {field.effectiveProvider ? truthProviderLabel(field.effectiveProvider) : "No source selected"}</p>
              <p className="mt-1 text-sm"><strong>Conflict:</strong> {readable(field.conflictState)}</p>
              {field.assertions.some((assertion) => assertion.humanConfirmed && assertion.provider === field.effectiveProvider) ? <p className="mt-2 text-sm font-bold">Confirmed in GameDay</p> : null}
              <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3"><p className="text-sm font-black">Why GameDay uses this</p><p className="mt-1 text-sm leading-6">{explanation}</p></div>
              <details className="mt-4"><summary className="cursor-pointer font-bold">Other sources and history</summary><ol className="mt-3 grid gap-3 text-sm">{field.history.map((entry, index) => <li className="border-l-2 border-[var(--line)] pl-3" key={entry.provider + entry.timestamp + index}><strong>{truthProviderLabel(entry.provider)}</strong> reported <span className="break-words">{displayValue(entry.value)}</span><span className="block text-[var(--muted)]">{dateLabel(entry.timestamp)} · {readable(entry.status)}{entry.humanConfirmed ? " · Confirmed in GameDay" : ""}</span></li>)}</ol></details>
            </article>;
          })}
        </div>}
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Relationships and sources</h2>
        {truth.relationships.length === 0 ? <p className="mt-2 text-sm text-[var(--muted)]">No supported relationship source is available.</p> : <ul className="mt-4 grid gap-3">{truth.relationships.map((relationship, index) => <li className="rounded-lg border border-[var(--line)] p-4" key={relationship.relationshipType + relationship.relatedLabel + relationship.provider + index}><strong>{readable(relationship.relationshipType)}</strong><span className="block text-sm">{relationship.relatedLabel}</span><span className="mt-1 block text-sm text-[var(--muted)]">Source: {truthProviderLabel(relationship.provider)} · {dateLabel(relationship.timestamp)}</span>{relationship.hasDifferentRelationship ? <span className="mt-2 block text-sm font-bold">Different relationship types were reported and remain separate.</span> : null}</li>)}</ul>}
      </section>

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Team and Family updates</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Delivery status is separate from canonical Truth. A failed update does not change the value above.</p>
        {truth.projectionItems.length === 0 ? <p className="mt-4 text-sm font-semibold">No update is pending.</p> : <div className="mt-4 grid gap-3">{truth.projectionItems.map((item) => <div className="flex flex-col gap-3 rounded-lg border border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}><div><p className="font-bold">{projectionStatusLabel(item.status)}</p><p className="text-sm text-[var(--muted)]">{readable(item.operationType)} · attempt {item.attemptCount}{item.lastErrorCode ? " · " + readable(item.lastErrorCode) : ""}</p></div>{item.status === "FAILED" ? <form action={retryTruthProjectionAction}><input name="organizationId" type="hidden" value={query.organizationId} /><input name="personId" type="hidden" value={personId} /><input name="queueId" type="hidden" value={item.id} /><button className="ui-button ui-button-secondary" type="submit">Retry Projection</button></form> : null}</div>)}</div>}
      </section>

      <details className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5"><summary className="cursor-pointer font-black">Advanced details</summary><p className="mt-3 break-all text-sm text-[var(--muted)]">Canonical person {truth.person.id}</p><p className="mt-1 text-sm text-[var(--muted)]">GameDay account claimed: {truth.accountClaimed ? "Yes" : "No"}</p></details>
    </main>
  );
}

