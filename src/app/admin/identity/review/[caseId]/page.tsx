import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canReviewIdentities } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { explainIdentityReason, projectionStatusLabel } from "@/lib/platform-identity-review";
import { getIdentityReviewCase } from "@/lib/services/platform-identity-review";
import { getOrganization } from "@/lib/services/organizations";
import {
  deferIdentityReviewAction,
  keepIdentitySeparateAction,
  linkIdentityRecordsAction,
  retryIdentityProjectionAction,
} from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ organizationId?: string; result?: string }>;
};

function statusMessage(result?: string) {
  if (result === "linked") return "Linked. GameDay is updating Team and Family records.";
  if (result === "separate") return "Kept separate. Future syncs will remember this decision.";
  if (result === "deferred") return "Deferred. The case remains unresolved for later review.";
  if (result === "stale") return "This case changed in another session. The authoritative state is shown below.";
  if (result === "retry-requested") return "Projection retry requested.";
  if (result === "failed" || result === "retry-failed") return "The action could not be completed. No identity decision was overwritten.";
  return null;
}

export default async function IdentityReviewDetailPage({ params, searchParams }: Props) {
  const [{ caseId }, query] = await Promise.all([params, searchParams]);
  const ctx = await getSessionContext();
  if (!ctx || !canReviewIdentities(ctx)) redirect(getRoleHome(ctx));
  if (!query.organizationId) notFound();
  const [reviewCase, organization] = await Promise.all([
    getIdentityReviewCase(query.organizationId, caseId).catch(() => null),
    getOrganization(query.organizationId).catch(() => null),
  ]);
  if (!reviewCase) notFound();
  const message = statusMessage(query.result);
  const open = reviewCase.reviewStatus === "open";

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="text-sm font-bold text-[var(--accent-strong)] underline" href={"/admin/identity/review?organizationId=" + encodeURIComponent(reviewCase.organizationId)}>Back to Identity Review</Link>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Identity Review</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Review possible duplicate</h1>
      <p className="mt-2 text-sm font-semibold text-[var(--muted)]">Organization: {organization?.name ?? "Authorized organization"}</p>
      {message ? <p aria-live="polite" className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-4 font-semibold">{message}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Incoming · {reviewCase.provider.replaceAll("_", " ")}</p>
          <h2 className="mt-2 text-2xl font-black">{reviewCase.incomingDisplayName}</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {reviewCase.incomingIdentifiers.map((identifier, index) => <li key={identifier.type + index}><strong>{identifier.type}:</strong> {identifier.maskedValue} · {identifier.verificationStatus.replaceAll("_", " ")}</li>)}
            {reviewCase.incomingIdentifiers.length === 0 ? <li className="text-[var(--muted)]">No decision-safe contact identifier supplied.</li> : null}
            {reviewCase.relationshipContext.map((relationship, index) => <li key={(relationship.relationshipType ?? "relationship") + index}><strong>Relationship:</strong> {(relationship.relationshipType ?? "context available").replaceAll("_", " ")}</li>)}
          </ul>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Why GameDay stopped</p>
          <ul className="mt-3 grid gap-3 text-sm leading-6">
            {reviewCase.reasonCodes.map((reason) => <li key={reason}>{explainIdentityReason(reason)}</li>)}
          </ul>
          <details className="mt-4 text-sm"><summary className="cursor-pointer font-bold">Advanced details</summary><p className="mt-2 break-all text-[var(--muted)]">Case {reviewCase.caseId}</p><p className="mt-1 text-[var(--muted)]">{reviewCase.reasonCodes.join(", ")}</p></details>
        </article>
      </div>

      <form action={linkIdentityRecordsAction} className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
        <fieldset disabled={!open}>
          <legend className="text-xl font-black">Is this the same person?</legend>
          <p className="mt-2 text-sm text-[var(--muted)]">Select only one candidate proposed by GameDay.</p>
          <div className="mt-4 grid gap-3">
            {reviewCase.candidatePeople.map((candidate) => (
              <div className="rounded-lg border border-[var(--line)] p-4" key={candidate.personId}>
                <label className="flex cursor-pointer gap-3">
                  <input className="mt-1 size-5" name="candidatePersonId" required type="radio" value={candidate.personId} />
                  <span><strong className="block text-lg">{candidate.displayName}</strong><span className="mt-1 block text-sm text-[var(--muted)]">{candidate.identifiers.map((identifier) => identifier.maskedValue + " · " + identifier.verificationStatus.replaceAll("_", " ")).join(" · ") || "No contact identifier displayed"}</span><span className="mt-1 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Sources: {candidate.provenanceProviders.join(", ") || "GameDay"}</span>{candidate.keepSeparate ? <span className="mt-2 block text-sm font-bold">Existing keep-separate decision</span> : null}</span>
                </label>
                <Link className="mt-3 inline-block text-sm font-bold text-[var(--accent-strong)] underline" href={"/admin/identity/truth/" + candidate.personId + "?organizationId=" + encodeURIComponent(reviewCase.organizationId)}>View Identity &amp; Sources</Link>
              </div>
            ))}
          </div>
          <input name="organizationId" type="hidden" value={reviewCase.organizationId} />
          <input name="caseId" type="hidden" value={reviewCase.caseId} />
          <input name="expectedVersion" type="hidden" value={reviewCase.reviewVersion} />
          <div className="mt-5 rounded-lg bg-[var(--accent-soft)] p-4"><p className="font-black">Link these records?</p><p className="mt-1 text-sm">Future syncs from this provider source will resolve to the selected GameDay person.</p></div>
          <button className="ui-button ui-button-primary mt-4" type="submit">Link Records</button>
        </fieldset>
      </form>

      {open ? <div className="mt-4 grid gap-4 md:grid-cols-2">
        <form action={keepIdentitySeparateAction} className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">Keep these people separate?</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">GameDay will remember this decision and will not automatically link this source to these candidates in future syncs.</p>
          <input name="organizationId" type="hidden" value={reviewCase.organizationId} /><input name="caseId" type="hidden" value={reviewCase.caseId} /><input name="expectedVersion" type="hidden" value={reviewCase.reviewVersion} />
          <button className="ui-button ui-button-secondary mt-4" type="submit">Keep Separate</button>
        </form>
        <form action={deferIdentityReviewAction} className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">Not ready to decide?</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Review Later leaves identity resolution unchanged and keeps the case available.</p>
          <input name="organizationId" type="hidden" value={reviewCase.organizationId} /><input name="caseId" type="hidden" value={reviewCase.caseId} /><input name="expectedVersion" type="hidden" value={reviewCase.reviewVersion} />
          <button className="ui-button ui-button-secondary mt-4" type="submit">Review Later</button>
        </form>
      </div> : null}

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Domain update</h2>
        {reviewCase.projectionItems.length === 0 ? <p className="mt-2 text-sm text-[var(--muted)]">No Team or Family projection is required.</p> : reviewCase.projectionItems.map((item) => (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div><p className="font-bold">{projectionStatusLabel(item.status)}</p><p className="text-sm text-[var(--muted)]">{item.operationType.replaceAll("_", " ")} · attempt {item.attemptCount}{item.lastErrorCode ? " · " + item.lastErrorCode.replaceAll("_", " ") : ""}</p></div>
            {item.status === "FAILED" ? <form action={retryIdentityProjectionAction}><input name="organizationId" type="hidden" value={reviewCase.organizationId} /><input name="caseId" type="hidden" value={reviewCase.caseId} /><input name="queueId" type="hidden" value={item.id} /><button className="ui-button ui-button-secondary" type="submit">Retry</button></form> : null}
          </div>
        ))}
      </section>
    </section>
  );
}
