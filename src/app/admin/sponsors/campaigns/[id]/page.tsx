import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignProof } from "@/lib/services/sponsor-campaigns";
import { BASIS_EXPLANATION, BASIS_LABEL } from "@/lib/services/sponsor-fulfillment-core";
import { getScopedOrganizationIds } from "@/lib/access/scoped-venue-data";
import { deleteCampaignAction } from "../actions";

export const dynamic = "force-dynamic";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function dateRange(startsOn: string, endsOn: string): string {
  const fmt = (d: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "America/Chicago" }).format(new Date(d + "T12:00:00Z"));
  return startsOn === endsOn ? fmt(startsOn) : `${fmt(startsOn)} – ${fmt(endsOn)}`;
}

function timestamp(iso: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(new Date(iso));
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <p className={`text-2xl font-black leading-none ${tone ?? "text-[var(--foreground)]"}`}>{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

export default async function CampaignProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCampaignProof(id);
  if (!result) notFound();
  // Object-level authorization: only view campaigns within the caller's org.
  const scopedOrgIds = await getScopedOrganizationIds();
  if (scopedOrgIds && result.campaign.organizationId && !scopedOrgIds.has(result.campaign.organizationId)) notFound();
  const { campaign, sponsorName, venueName, proof, suppression } = result;
  const rateTone = proof.deliveryRate >= 0.95 ? "text-emerald-600" : proof.deliveryRate >= 0.75 ? "text-amber-700" : "text-red-700";

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/sponsors/campaigns" className="text-xs font-black text-[var(--accent-strong)]">← Campaigns</Link>
        <form action={deleteCampaignAction}>
          <input type="hidden" name="campaign_id" value={campaign.id} />
          <button type="submit" className="text-xs font-bold text-[var(--muted)] hover:text-red-700">Delete campaign</button>
        </form>
      </div>

      <header className="mt-3 border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsor Campaign Performance</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{sponsorName}</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
          {campaign.name}
          {campaign.packageName ? ` · ${campaign.packageName}` : ""} · {venueName ?? "All venues"} · {dateRange(campaign.startsOn, campaign.endsOn)}
        </p>
      </header>

      {/* Above the metrics on purpose: this changes how every figure below should
          be read, so it cannot sit under them where an invoicer might miss it. */}
      {suppression.suppressed ? (
        <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-black text-red-900">{suppression.headline}</p>
          <p className="mt-2 text-sm leading-6 text-red-900">{suppression.detail}</p>
          <Link href="/admin/sponsors/policy" className="mt-2 inline-block text-sm font-bold text-red-900 underline">
            Review advertising policy
          </Link>
        </div>
      ) : null}

      <section className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Delivery rate" value={pct(proof.deliveryRate)} tone={rateTone} />
        <Metric label="Delivered" value={String(proof.deliveredTotal)} />
        <Metric label="Contracted" value={String(proof.contractedTotal)} />
        <Metric label="Games connected" value={`${proof.gamesConnected}/${proof.gamesCovered}`} />
        <Metric label="Impressions" value={proof.impressions.toLocaleString()} />
        <Metric label="Clicks · CTR" value={`${proof.clicks} · ${pct(proof.ctr)}`} />
      </section>

      {/* Make-good: lead with what's owed rather than waiting for the sponsor to
          audit you. A venue that volunteers the shortfall keeps the renewal. */}
      {proof.makeGood.totalShortfall > 0 ? (
        <section
          className={`mt-5 rounded-xl border p-4 ${
            proof.makeGood.required ? "border-amber-300 bg-amber-50" : "border-[var(--line)] bg-white"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className={`text-xs font-black uppercase tracking-[0.12em] ${proof.makeGood.required ? "text-amber-900" : "text-[var(--muted)]"}`}>
              {proof.makeGood.required ? "Make-good owed" : "Under-delivery (within tolerance)"}
            </p>
            <p className={`text-sm font-black ${proof.makeGood.required ? "text-amber-900" : "text-[var(--muted)]"}`}>
              {proof.makeGood.totalShortfall} placement{proof.makeGood.totalShortfall === 1 ? "" : "s"} short
            </p>
          </div>
          <p className={`mt-2 text-sm font-semibold leading-6 ${proof.makeGood.required ? "text-amber-900" : "text-[var(--muted)]"}`}>
            {proof.makeGood.recommendation}
          </p>
          <ul className="mt-2 grid gap-1">
            {proof.makeGood.lines.map((line) => (
              <li key={line.assetType} className="text-xs font-bold text-[var(--foreground)]">
                {line.label}: {line.delivered} of {line.contracted} — <span className="text-red-700">{line.shortfall} short</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-7">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Delivery by asset</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--background)] text-left text-[11px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">
                <th className="px-4 py-2">Asset</th>
                <th className="px-4 py-2 text-right">Contracted</th>
                <th className="px-4 py-2 text-right">Delivered</th>
                <th className="px-4 py-2 text-right">Short</th>
                <th className="px-4 py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {proof.lines.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-4 text-sm font-semibold text-[var(--muted)]">No contracted assets on this campaign.</td></tr>
              ) : (
                proof.lines.map((line) => (
                  <tr key={line.assetType} className="border-t border-[var(--line)]">
                    <td className="px-4 py-2 font-bold text-[var(--foreground)]">{line.label}{line.contracted === 0 ? <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-700">bonus</span> : null}</td>
                    <td className="px-4 py-2 text-right font-semibold">{line.contracted || "—"}</td>
                    <td className="px-4 py-2 text-right font-black">{line.delivered}</td>
                    <td className={`px-4 py-2 text-right font-bold ${line.underDelivered ? "text-red-700" : "text-[var(--muted)]"}`}>
                      {line.contracted === 0 ? "—" : line.shortfall || "0"}
                    </td>
                    <td className={`px-4 py-2 text-right font-black ${line.contracted === 0 ? "text-emerald-600" : line.deliveryRate >= 0.95 ? "text-emerald-600" : line.deliveryRate >= 0.75 ? "text-amber-700" : "text-red-700"}`}>
                      {line.contracted === 0 ? "—" : pct(line.deliveryRate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Fulfillment is automatic: each covered game delivers its sponsor assets as it reaches <strong>live</strong> and{" "}
          <strong>final</strong> in the Connected Game Engine. Delivery timestamps below come from the game record itself.
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          <strong>{BASIS_LABEL[proof.basis.placements]}</strong> placement counts — {BASIS_EXPLANATION[proof.basis.placements]}{" "}
          Game milestones and impressions/clicks are <strong>{BASIS_LABEL.verified.toLowerCase()}</strong>: {BASIS_EXPLANATION.verified.toLowerCase()}
        </p>
      </section>

      {proof.timeline.length > 0 ? (
        <section className="mt-7">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Delivery timeline</h2>
          <div className="mt-3 grid gap-2">
            {proof.timeline.map((entry, i) => (
              <div key={`${entry.assetType}-${entry.gameLabel}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{entry.label}</p>
                  <p className="truncate text-xs font-semibold text-[var(--muted)]">{entry.gameLabel}</p>
                </div>
                <p className="shrink-0 text-xs font-black text-[var(--muted)]">{timestamp(entry.occurredAt)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
