import Link from "next/link";
import {
  getNlsaPitch,
  nlsaDemoMatches,
  nlsaDemoOps,
  nlsaDemoPitches,
  type NlsaMatchStatus,
  type NlsaPitchStatus,
} from "@/lib/demo/nlsa";

export const dynamic = "force-dynamic";

const pitchStatusClasses: Record<NlsaPitchStatus, string> = {
  OPEN: "border-emerald-200 bg-emerald-50 text-emerald-900",
  HOLD: "border-amber-200 bg-amber-50 text-amber-950",
  CLOSED: "border-rose-200 bg-rose-50 text-rose-950",
  MOVED: "border-sky-200 bg-sky-50 text-sky-950",
};

const matchStatusClasses: Record<NlsaMatchStatus, string> = {
  SCHEDULED: "bg-slate-100 text-slate-800",
  LIVE: "bg-emerald-100 text-emerald-950",
  DELAYED: "bg-amber-100 text-amber-950",
  MOVED: "bg-sky-100 text-sky-950",
};

export default function NlsaTodayPage() {
  const heldOrMoved = nlsaDemoPitches.filter((pitch) => pitch.status === "HOLD" || pitch.status === "MOVED").length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border border-black/10 bg-[var(--black-soft)] p-6 text-white sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-green-200">Nurve Sports Platform · Soccer Demo</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">NLSA Today</h1>
          <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-white/85">
            A soccer-first operating view for New Lenox Soccer Association leadership. Synthetic demo data only — no live NLSA or SprocketSports data is connected.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-black">Organization Owner view</span>
            <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-black">Source: SprocketSports placeholder</span>
            <Link className="rounded-lg bg-white px-4 py-3 text-sm font-black text-black" href="#identity">View identity + provenance</Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Matches Today" value={String(nlsaDemoOps.matchesToday)} />
          <Metric label="Configured Pitches" value={String(nlsaDemoPitches.length)} />
          <Metric label="Held / Moved" value={String(heldOrMoved)} />
          <Metric label="Ops Actions" value={String(nlsaDemoOps.unresolvedActions.length)} />
          <Metric label="Staffing" value={nlsaDemoOps.staffing.status} />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Match operations</p>
                <h2 className="mt-2 text-2xl font-black">Today across NLSA</h2>
              </div>
              <p className="text-sm font-bold text-[var(--muted)]">Schedule source is attributed per match.</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {nlsaDemoMatches.map((match) => {
                const pitch = getNlsaPitch(match.pitchId);
                return (
                  <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={match.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{match.division}</p>
                        <h3 className="mt-1 text-lg font-black">{match.homeTeam} vs {match.awayTeam}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${matchStatusClasses[match.status]}`}>{match.status}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="font-bold text-[var(--muted)]">Kickoff</dt>
                        <dd className="mt-1 font-black">{match.kickoff}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--muted)]">Pitch</dt>
                        <dd className="mt-1 font-black">{pitch?.name ?? "Unassigned"}</dd>
                      </div>
                    </dl>
                    {match.note ? <p className="mt-4 rounded-lg bg-white p-3 text-sm font-bold leading-6">{match.note}</p> : null}
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">Source: {match.source}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="grid gap-5">
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-950">Weather disruption</p>
              <h2 className="mt-2 text-xl font-black text-amber-950">Lightning hold in progress</h2>
              <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
                Pitch 2 is on HOLD. One U12 match has already moved from Pitch 3 to Pitch 5 so the schedule can keep moving.
              </p>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Next operational decisions</p>
              <ol className="mt-4 grid gap-3">
                {nlsaDemoOps.unresolvedActions.map((action, index) => (
                  <li className="flex gap-3 text-sm font-bold leading-6" key={action}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--black-soft)] text-xs font-black text-white">{index + 1}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Coverage</p>
              <p className="mt-2 text-lg font-black">{nlsaDemoOps.staffing.status}</p>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{nlsaDemoOps.staffing.details}</p>
            </section>
          </aside>
        </section>

        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Pitch status</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nlsaDemoPitches.map((pitch) => (
              <article className={`rounded-lg border p-4 ${pitchStatusClasses[pitch.status]}`} key={pitch.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.1em] opacity-70">{pitch.complexName}</p>
                    <h3 className="mt-1 text-xl font-black">{pitch.name}</h3>
                  </div>
                  <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-black">{pitch.status}</span>
                </div>
                {pitch.note ? <p className="mt-3 text-sm font-bold leading-6">{pitch.note}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Family experience</p>
            <h2 className="mt-2 text-2xl font-black">Answer “where do I go?” first</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">{nlsaDemoOps.familyContext.parking}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{nlsaDemoOps.familyContext.services}</p>
            <p className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm font-black">Moved match example: U12 Boys → South Complex, Pitch 5.</p>
          </section>

          <section className="rounded-lg border border-[var(--line)] bg-white p-5" id="identity">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Identity + provenance</p>
            <h2 className="mt-2 text-2xl font-black">Keep upstream truth visible</h2>
            <ul className="mt-4 grid gap-3 text-sm font-bold leading-6 text-[var(--muted)]">
              <li>• SprocketSports is represented as the schedule/team source, not replaced.</li>
              <li>• Manual and venue-originated operational changes retain their own source labels.</li>
              <li>• Organization Owner, Staff, Coach, and Parent experiences will share the same normalized event while enforcing different permissions.</li>
              <li>• This foundation uses synthetic data only; live identity linking and Sprocket ingestion remain behind the staging acceptance gate.</li>
            </ul>
          </section>
        </section>

        <section className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-5 text-sky-950">
          <p className="text-sm font-black uppercase tracking-[0.14em]">Demo boundary</p>
          <p className="mt-2 text-sm font-bold leading-6">
            This first slice proves the soccer-specific operating model without waiting on Supabase access. Authenticated Dion/Staff/Coach/Parent accounts, tenant-isolation tests, and live staging seeding remain required before external credentials are released.
          </p>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}
