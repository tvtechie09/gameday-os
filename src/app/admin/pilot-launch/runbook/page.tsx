import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageVenueSettings, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { PILOT_REHEARSAL_STEPS, pilotStatusLabel } from "@/lib/services/pilot-launch-core";
import { getPilotLaunchWorkspace } from "@/lib/services/pilot-launch";

export const dynamic = "force-dynamic";

const phases = [
  {
    title: "Before gates open",
    steps: [
      "Confirm primary and backup operators can sign in on their own phones.",
      "Spot-check the imported schedule against the source and printed backup.",
      "Scan at least one printed field QR code using cellular data.",
      "Confirm current weather, emergency contacts, radio channel, and PA fallback.",
    ],
  },
  {
    title: "Opening",
    steps: [
      "Open Command Center and confirm the correct venue, fields, games, and device posture.",
      "Resolve any field or schedule mismatch before spectators arrive.",
      "Verify the public venue and field pages show the expected first games.",
      "Tell on-site staff who owns decisions and who serves as backup.",
    ],
  },
  {
    title: "Live operations",
    steps: [
      "Use Command Center as the shared source for field status, schedule, and active alerts.",
      "Publish only confirmed changes; use a clear all-clear when normal operations resume.",
      "Check the public QR experience after every venue-wide delay or field reassignment.",
      "Record support incidents while evidence is fresh, including who owned the response.",
    ],
  },
  {
    title: "Closing",
    steps: [
      "Clear expired alerts and restore fields to their expected status.",
      "Resolve or assign every open incident before the team leaves.",
      "Record schedule, QR, alert-delivery, and developer-intervention outcomes.",
      "Decide the next operating date and the single most important improvement.",
    ],
  },
] as const;

export default async function PilotRunbookPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !canManageVenueSettings(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));

  const { venueId } = await searchParams;
  const scoped = await getScopedVenuesAndFields();
  const venue = scoped.venues.find((item) => item.id === venueId) ?? scoped.venues[0] ?? null;
  const workspace = venue ? await getPilotLaunchWorkspace(venue.id).catch(() => null) : null;
  const launch = workspace?.launch ?? null;
  const checks = new Map((workspace?.checks ?? []).map((check) => [check.checkKey, check]));
  const openIncidents = (workspace?.incidents ?? []).filter((incident) => incident.status === "open");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 print:max-w-none print:px-0 print:py-0">
      <header className="border-b border-[var(--line)] pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Game-day runbook</p>
            <h1 className="mt-1 text-3xl font-black">{venue?.name ?? "Pilot venue"}</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
              {launch ? `${pilotStatusLabel(launch.status)} · Target ${launch.targetLaunchDate || "not scheduled"}` : "Start the pilot workflow to personalize this runbook."}
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black print:hidden" href={venue ? `/admin/pilot-launch?venueId=${venue.id}` : "/admin/pilot-launch"}>Back to launch gate</Link>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Keep this page open or print it before the operating day. It is the shared sequence for venue staff—not a second dashboard.</p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--line)] p-4"><p className="text-xs font-black uppercase text-[var(--muted)]">Primary</p><p className="mt-2 font-black">{launch?.primaryOwnerName || "Not assigned"}</p><p className="mt-1 text-sm text-[var(--muted)]">{launch?.primaryOwnerContact || "No contact"}</p></article>
        <article className="rounded-xl border border-[var(--line)] p-4"><p className="text-xs font-black uppercase text-[var(--muted)]">Backup</p><p className="mt-2 font-black">{launch?.backupOwnerName || "Not assigned"}</p><p className="mt-1 text-sm text-[var(--muted)]">{launch?.backupOwnerContact || "No contact"}</p></article>
        <article className="rounded-xl border border-[var(--line)] p-4"><p className="text-xs font-black uppercase text-[var(--muted)]">Escalation</p><p className="mt-2 text-sm font-semibold leading-6">{launch?.escalationContact || "Not documented"}</p></article>
      </section>

      <section className="mt-6 rounded-xl border border-[var(--line)] p-5">
        <h2 className="text-xl font-black">Rehearsal evidence</h2>
        <div className="mt-4 grid gap-2">
          {PILOT_REHEARSAL_STEPS.map((step) => {
            const evidence = checks.get(step.key);
            return <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] py-3 last:border-0" key={step.key}><div><p className="text-sm font-black">{step.label}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{evidence?.notes || step.expected}</p></div><span className="shrink-0 text-xs font-black uppercase">{evidence?.status ?? "pending"}</span></div>;
          })}
        </div>
      </section>

      {phases.map((phase, index) => (
        <section className="mt-6 break-inside-avoid rounded-xl border border-[var(--line)] p-5" key={phase.title}>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Phase {index + 1}</p>
          <h2 className="mt-1 text-xl font-black">{phase.title}</h2>
          <ol className="mt-4 grid gap-3">
            {phase.steps.map((step, stepIndex) => <li className="flex gap-3 text-sm leading-6" key={step}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--background)] text-xs font-black">{stepIndex + 1}</span><span>{step}</span></li>)}
          </ol>
        </section>
      ))}

      <section className="mt-6 break-inside-avoid rounded-xl border-2 border-red-200 bg-red-50 p-5">
        <h2 className="text-xl font-black text-red-950">Stop and fall back when</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-red-950">
          <li>• Staff cannot access the correct venue or cannot identify the current schedule.</li>
          <li>• A high or urgent incident risks publishing incorrect safety or schedule information.</li>
          <li>• Public QR pages are unavailable and staff cannot communicate a manual alternative.</li>
          <li>• The primary operator is unavailable and the backup cannot take over.</li>
        </ul>
        <p className="mt-4 text-sm font-bold text-red-950">Fallback: {launch?.supportNotes || "Use the printed schedule, radio/PA communication, and manual field-status process. Record the incident before resuming."}</p>
      </section>

      <section className="my-6 break-inside-avoid rounded-xl border border-[var(--line)] p-5">
        <h2 className="text-xl font-black">Open support items</h2>
        {openIncidents.length === 0 ? <p className="mt-2 text-sm text-[var(--muted)]">No open incidents recorded.</p> : <ul className="mt-3 grid gap-2 text-sm">{openIncidents.map((incident) => <li key={incident.id}><span className="font-black uppercase">{incident.severity}</span> · {incident.summary} · Owner: {incident.ownerName || "unassigned"}</li>)}</ul>}
        {launch?.goNoGoNotes ? <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm leading-6"><span className="font-black">Go / no-go notes:</span> {launch.goNoGoNotes}</p> : null}
      </section>
    </main>
  );
}
