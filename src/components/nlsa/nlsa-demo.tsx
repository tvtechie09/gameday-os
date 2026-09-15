import Link from "next/link";
import type { AccessContext } from "@/lib/access/capabilities";
import { getCoachMatch, getFamilyComplex, nlsaDemo, type NlsaMatch, type NlsaScenario } from "@/lib/demo/nlsa";

function badgeClass(state: string): string {
  if (["OPEN", "SCHEDULED", "COVERED", "RESOLVED"].includes(state)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["HOLD", "DELAYED", "NEEDS HELP", "BLOCKED"].includes(state)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (["CLOSED"].includes(state)) return "border-red-200 bg-red-50 text-red-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black tracking-wide ${badgeClass(String(children))}`}>{children}</span>;
}

function Source({ value }: { value: string }) {
  return <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">Source: {value}</span>;
}

export function NlsaHeader({ ctx, active, scenario }: { ctx: AccessContext; active: "today" | "operations" | "coach" | "family"; scenario: NlsaScenario }) {
  const links = ctx.roleKey === "organization_admin"
    ? [{ href: "/demo/nlsa/today", label: "Today", key: "today" }, { href: "/demo/nlsa/operations", label: "Operations", key: "operations" }]
    : ctx.roleKey === "league_staff"
      ? [{ href: "/demo/nlsa/operations", label: "Operations", key: "operations" }]
      : ctx.roleKey === "coach"
        ? [{ href: "/demo/nlsa/coach", label: "My Team", key: "coach" }]
        : [{ href: "/demo/nlsa/family", label: "My Match", key: "family" }];
  const scenarioSuffix = scenario.key === "normal" ? "" : `?scenario=${scenario.key}`;
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Nurve Sports Operations · Private demo</p>
          <p className="mt-1 truncate text-lg font-black text-slate-950">{nlsaDemo.organization}</p>
          <p className="text-xs font-semibold text-slate-500">Signed in as {ctx.displayName} · NLSA scope only</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="NLSA demo" className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Link className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-black ${active === link.key ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-800"}`} href={`${link.href}${scenarioSuffix}`} key={link.key}>{link.label}</Link>
            ))}
          </nav>
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700" href="/logout">Sign out</Link>
        </div>
      </div>
    </header>
  );
}

export function ScenarioSwitch({ active, basePath }: { active: NlsaScenario["key"]; basePath: string }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Deterministic demo scenario">
      {([
        ["normal", "1 · Normal"],
        ["lightning", "2 · Lightning hold"],
        ["recovery", "3 · All clear"],
      ] as const).map(([key, label]) => (
        <Link className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-black ${active === key ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"}`} href={key === "normal" ? basePath : `${basePath}?scenario=${key}`} key={key}>{label}</Link>
      ))}
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "attention" }) {
  return (
    <article className={`rounded-xl border p-4 ${tone === "attention" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function MatchCard({ match, compact = false }: { match: NlsaMatch; compact?: boolean }) {
  return (
    <article className={`rounded-xl border p-4 ${match.affected ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{match.division}</p>
          <h3 className="mt-1 text-base font-black text-slate-950">{match.home} vs {match.away}</h3>
        </div>
        <Badge>{match.state}</Badge>
      </div>
      <dl className={`mt-4 grid gap-3 text-sm ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
        <div><dt className="font-bold text-slate-500">Kickoff</dt><dd className="font-black text-slate-950">{match.kickoff}{match.originalKickoff ? <span className="ml-2 font-semibold text-slate-500 line-through">{match.originalKickoff}</span> : null}</dd></div>
        <div><dt className="font-bold text-slate-500">Pitch</dt><dd className="font-black text-slate-950">{match.pitch}{match.originalPitch ? <span className="ml-2 font-semibold text-slate-500 line-through">{match.originalPitch}</span> : null}</dd></div>
        {!compact ? <div><dt className="font-bold text-slate-500">Complex</dt><dd className="font-semibold text-slate-800">{match.complex}</dd></div> : null}
        {!compact ? <div><dt className="font-bold text-slate-500">Referee</dt><dd className="font-semibold text-slate-800">{match.referee}</dd></div> : null}
      </dl>
      <div className="mt-4"><Source value={match.source} /></div>
    </article>
  );
}

export function OwnerToday({ scenario }: { scenario: NlsaScenario }) {
  const attention = scenario.matches.filter((match) => match.affected).length + scenario.issues.filter((issue) => issue.status !== "RESOLVED").length;
  const open = scenario.pitches.filter((pitch) => pitch.state === "OPEN").length;
  const held = scenario.pitches.filter((pitch) => pitch.state === "HOLD").length;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Organization owner · {nlsaDemo.dateLabel}</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Here&apos;s what needs attention today.</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">{scenario.summary}</p>
          </div>
          <ScenarioSwitch active={scenario.key} basePath="/demo/nlsa/today" />
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Matches" value={String(scenario.matches.length)} />
        <Metric label="Pitches open" value={`${open} / ${scenario.pitches.length}`} />
        <Metric label="On hold" value={String(held)} tone={held ? "attention" : "default"} />
        <Metric label="Matches affected" value={String(scenario.matches.filter((match) => match.affected).length)} tone={scenario.matches.some((match) => match.affected) ? "attention" : "default"} />
        <Metric label="Attention items" value={String(attention)} tone={attention ? "attention" : "default"} />
      </section>

      <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Next best action</p>
        <p className="mt-2 text-lg font-black text-amber-950">{scenario.nextAction}</p>
        <p className="mt-2 text-sm font-semibold text-amber-900">{scenario.weather}</p>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <section>
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Schedule impact</p><h2 className="mt-1 text-2xl font-black">Today&apos;s matches</h2></div>
            <Link className="text-sm font-black text-emerald-800" href={`/demo/nlsa/operations${scenario.key === "normal" ? "" : `?scenario=${scenario.key}`}`}>Full operations view →</Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{scenario.matches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
        </section>
        <aside className="grid content-start gap-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Pitch status</p>
            <div className="mt-4 grid gap-3">{scenario.pitches.map((pitch) => <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={pitch.id}><div><p className="font-black">{pitch.name}</p><p className="text-xs text-slate-500">{pitch.complex} · {pitch.note}</p></div><Badge>{pitch.state}</Badge></div>)}</div>
          </section>
          <Staffing scenario={scenario} />
          <IntegrationCard />
        </aside>
      </div>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Identity and provenance</p>
        <h2 className="mt-1 text-xl font-black">Explicit links, no silent merges</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{nlsaDemo.identity.canonicalPerson}</strong><br />{nlsaDemo.identity.sourceIdentity}<br /><span className="font-black text-emerald-700">{nlsaDemo.identity.relationship}</span> · {nlsaDemo.identity.provenance}</p>
          <p className="rounded-lg bg-slate-50 p-3 text-sm">{nlsaDemo.identity.possibleMatch}<br />{nlsaDemo.identity.distinct}<br />{nlsaDemo.identity.reversibility}</p>
        </div>
      </section>
    </main>
  );
}

function Staffing({ scenario }: { scenario: NlsaScenario }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Coverage</p>
      <div className="mt-4 grid gap-3">{scenario.staffing.map((item) => <div key={item.area}><div className="flex items-center justify-between gap-2"><p className="font-black">{item.area}</p><Badge>{item.status}</Badge></div><p className="mt-1 text-sm text-slate-600">{item.detail}</p></div>)}</div>
    </section>
  );
}

function IntegrationCard() {
  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-800">Source boundary</p>
      <h2 className="mt-1 text-lg font-black">{nlsaDemo.integration.provider}</h2>
      <p className="mt-2 text-sm font-bold text-sky-950">{nlsaDemo.integration.mode}</p>
      <p className="mt-2 text-sm leading-6 text-sky-900">{nlsaDemo.integration.explanation}</p>
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-sky-800">{nlsaDemo.integration.state}</p>
    </section>
  );
}

export function OperationsView({ scenario, isOwner }: { scenario: NlsaScenario; isOwner: boolean }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{isOwner ? "Director view" : "Staff view"}</p><h1 className="mt-2 text-3xl font-black">Saturday operations</h1><p className="mt-2 text-slate-600">{scenario.summary} All records on this page are synthetic.</p></div>
        <ScenarioSwitch active={scenario.key} basePath="/demo/nlsa/operations" />
      </div>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{scenario.matches.map((match) => <MatchCard key={match.id} match={match} />)}</section>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Open issues</p><div className="mt-4 grid gap-3">{scenario.issues.map((issue) => <article className="rounded-lg bg-slate-50 p-4" key={issue.id}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">{issue.title}</h2><Badge>{issue.status}</Badge></div><p className="mt-2 text-sm text-slate-600">{issue.detail}</p><p className="mt-2 text-xs font-bold text-slate-500">Owner: {issue.owner}</p></article>)}</div></section>
        <Staffing scenario={scenario} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Announcements</p><div className="mt-4 grid gap-3">{scenario.announcements.map((item, index) => <article className="rounded-lg bg-slate-50 p-4" key={`${item.audience}-${index}`}><p className="font-black">{item.audience}</p><p className="mt-1 text-sm text-slate-700">{item.message}</p><div className="mt-3"><Source value={item.source} /></div></article>)}</div></section>
        <section className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Operational history</p><div className="mt-4 grid gap-3">{scenario.history.map((item) => <div className="border-l-2 border-emerald-600 pl-3" key={`${item.time}-${item.event}`}><p className="text-xs font-black text-slate-500">{item.time} · {item.actor}</p><p className="mt-1 text-sm font-bold">{item.event}</p></div>)}</div></section>
      </div>
      {isOwner ? <div className="mt-5"><IntegrationCard /></div> : null}
    </main>
  );
}

export function CoachView({ scenario }: { scenario: NlsaScenario }) {
  const match = getCoachMatch(scenario);
  const alert = scenario.announcements.find((item) => item.audience === "Pitch 3 teams") ?? scenario.announcements[0];
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">Coach · NLSA U12 Green</p><h1 className="mt-2 text-3xl font-black">Your next match</h1><p className="mt-2 text-slate-300">Only updates for your team are shown here.</p><div className="mt-5"><ScenarioSwitch active={scenario.key} basePath="/demo/nlsa/coach" /></div></section>
      {match.affected ? <section className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Action required</p><p className="mt-2 text-xl font-black text-amber-950">Report to {match.pitch}{match.originalPitch ? ` instead of ${match.originalPitch}` : ""}.</p><p className="mt-2 text-sm font-semibold text-amber-900">{alert?.message}</p></section> : null}
      <div className="mt-5"><MatchCard match={match} /></div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Arrival</h2><p className="mt-2 text-sm leading-6 text-slate-600">Arrive 30 minutes before kickoff. Use the north lot and meet beside the team check-in sign near {match.pitch}.</p><p className="mt-3 text-sm font-bold text-slate-700">{scenario.weather}</p></section>
    </main>
  );
}

export function FamilyView({ scenario }: { scenario: NlsaScenario }) {
  const match = getCoachMatch(scenario);
  const complex = getFamilyComplex(match);
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <section className={`rounded-2xl p-5 sm:p-7 ${match.affected ? "bg-amber-100 text-amber-950" : "bg-emerald-800 text-white"}`}>
        <p className="text-xs font-black uppercase tracking-[0.14em]">Family match update</p>
        <h1 className="mt-2 text-3xl font-black">Go to {match.pitch}</h1>
        <p className="mt-2 text-lg font-bold">{match.complex} · {match.kickoff}</p>
        {match.originalPitch ? <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm font-black text-amber-950">Location changed from {match.originalPitch} to {match.pitch}.</p> : null}
        {match.originalKickoff ? <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm font-black text-amber-950">Kickoff changed from {match.originalKickoff} to {match.kickoff}.</p> : null}
        <div className="mt-5"><ScenarioSwitch active={scenario.key} basePath="/demo/nlsa/family" /></div>
      </section>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Where do I go?</p><h2 className="mt-1 text-xl font-black">{complex.name}</h2><p className="mt-2 text-sm text-slate-600">{complex.address}</p><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Parking" value={complex.parking} /><Info label="Restrooms" value={complex.restrooms} /><Info label="First aid" value={complex.firstAid} /><Info label="Concessions" value={complex.concessions} /></dl></section>
      <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-sky-800">Match source</p><p className="mt-2 text-sm font-bold text-sky-950">Schedule shown from a simulated SprocketSports source record. No live connection or real family data is used.</p></section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value}</dd></div>;
}
