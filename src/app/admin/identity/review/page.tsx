import Link from "next/link";
import { redirect } from "next/navigation";
import { canReviewIdentities, isPlatformAdmin } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { explainIdentityReason, isIdentityReviewFilter } from "@/lib/platform-identity-review";
import { listIdentityReviewCases, resolveIdentityReviewOrganization } from "@/lib/services/platform-identity-review";
import { getOrganizations } from "@/lib/services/organizations";

export const dynamic = "force-dynamic";

type Search = Promise<{ organizationId?: string; filter?: string; query?: string }>;

function providerLabel(provider: string) {
  return provider.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function IdentityReviewPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx || !canReviewIdentities(ctx)) redirect(getRoleHome(ctx));

  const organizations = isPlatformAdmin(ctx) || ctx.scopeType === "platform"
    ? await getOrganizations().catch(() => [])
    : [];
  const requestedOrganization = params.organizationId || (organizations.length === 1 ? organizations[0].id : null);
  const scope = await resolveIdentityReviewOrganization(requestedOrganization);
  const filter = isIdentityReviewFilter(params.filter) ? params.filter : "needs_review";
  const query = params.query?.trim().toLowerCase() ?? "";
  const cases = scope.organizationId
    ? await listIdentityReviewCases(scope.organizationId, filter).catch(() => [])
    : [];
  const visibleCases = query
    ? cases.filter((item) => [item.caseId, item.provider, item.incomingDisplayName].some((value) => value.toLowerCase().includes(query)))
    : cases;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Identity Review</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">{visibleCases.length} {filter === "resolved" ? "Resolved" : filter === "deferred" ? "Deferred" : "Needs Review"}</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
        Resolve only the identity exceptions GameDay could not decide safely. Names alone never link records.
      </p>

      <form className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 md:grid-cols-[1fr_1fr_auto]" method="get">
        {organizations.length > 0 ? (
          <label className="grid gap-1 text-sm font-bold">
            Organization
            <select className="min-h-11 rounded-md border border-[var(--line)] px-3" defaultValue={scope.organizationId ?? ""} name="organizationId">
              <option value="">Choose an organization</option>
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          </label>
        ) : <input name="organizationId" type="hidden" value={scope.organizationId ?? ""} />}
        <label className="grid gap-1 text-sm font-bold">
          Search this review queue
          <input className="min-h-11 rounded-md border border-[var(--line)] px-3" defaultValue={params.query ?? ""} name="query" placeholder="Name, provider, or case ID" />
        </label>
        <button className="ui-button ui-button-secondary self-end" type="submit">Apply</button>
        <input name="filter" type="hidden" value={filter} />
      </form>

      <nav aria-label="Identity review filters" className="mt-5 flex flex-wrap gap-2">
        {(["needs_review", "deferred", "resolved"] as const).map((value) => {
          const queryParams = new URLSearchParams({ filter: value });
          if (scope.organizationId) queryParams.set("organizationId", scope.organizationId);
          return <Link className={value === filter ? "ui-button ui-button-primary" : "ui-button ui-button-secondary"} href={"/admin/identity/review?" + queryParams.toString()} key={value}>{value === "needs_review" ? "Needs Review" : value === "deferred" ? "Deferred" : "Resolved"}</Link>;
        })}
      </nav>

      <div className="mt-6 grid gap-4">
        {!scope.organizationId ? (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6"><h2 className="text-xl font-black">Choose an organization</h2><p className="mt-2 text-sm text-[var(--muted)]">Identity cases are always reviewed inside one organization.</p></div>
        ) : visibleCases.length === 0 ? (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6"><h2 className="text-xl font-black">Queue clear</h2><p className="mt-2 text-sm text-[var(--muted)]">No cases match this view.</p></div>
        ) : visibleCases.map((item) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm" key={item.caseId}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Possible duplicate</p>
                <h2 className="mt-2 text-xl font-black">{item.incomingDisplayName}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Incoming from {providerLabel(item.provider)} · {item.candidateCount} candidate{item.candidateCount === 1 ? "" : "s"}</p>
              </div>
              <Link className="ui-button ui-button-primary" href={"/admin/identity/review/" + item.caseId + "?organizationId=" + encodeURIComponent(item.organizationId)}>Review</Link>
            </div>
            <p className="mt-4 text-sm leading-6">{explainIdentityReason(item.reasonCodes[0] ?? "")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
