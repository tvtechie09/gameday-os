import Link from "next/link";
import type { ReactNode } from "react";
import type { CrossroadsEquipmentEndpoint, CrossroadsGame, CrossroadsGameStatus } from "@/lib/demo/crossroads";

export function CrossroadsStatusBadge({ status }: { status: CrossroadsGameStatus | "open" | "busy" | "closed" | "restricted" }) {
  const classes: Record<string, string> = {
    busy: "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
    closed: "bg-red-100 text-red-900 ring-1 ring-red-200",
    delayed: "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
    final: "bg-slate-200 text-slate-900 ring-1 ring-slate-300",
    live: "bg-green-600 text-white",
    maintenance: "bg-slate-900 text-white",
    open: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    restricted: "bg-red-100 text-red-900 ring-1 ring-red-200",
    scheduled: "bg-white text-slate-800 ring-1 ring-slate-200",
    warmups: "bg-sky-100 text-sky-950 ring-1 ring-sky-200",
  };

  return <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${classes[status] ?? classes.scheduled}`}>{status}</span>;
}

export function CrossroadsPageShell({
  actions,
  children,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/venue/crossroads" className="text-sm font-bold text-[var(--accent-strong)]">
              Crossroads Demo
            </Link>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">{title}</h1>
          </div>
          {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div> : null}
        </div>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

export function CrossroadsModeLinks() {
  const links = [
    ["Family Mode", "/venue/crossroads/family"],
    ["Tournament Mode", "/venue/crossroads/tournament"],
    ["Crossroads Today", "/demo/crossroads/today"],
    ["Operations Center", "/demo/crossroads/operations"],
    ["Executive Summary", "/demo/crossroads/gm"],
    ["Bar TV Dashboard", "/demo/crossroads/tv"],
    ["Media Engine", "/demo/crossroads/media"],
    ["Staff Mode", "/demo/crossroads/staff"],
  ];

  return (
    <>
      {links.map(([label, href]) => (
        <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" href={href} key={href}>
          {label}
        </Link>
      ))}
    </>
  );
}

export function CrossroadsGameCard({ game }: { game: CrossroadsGame }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black">{game.title}</h3>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {game.surfaceCode} · {game.startTime}
          </p>
        </div>
        <CrossroadsStatusBadge status={game.status} />
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-[var(--background)] p-3">
        <p className="text-sm font-black">{game.homeTeam}</p>
        <p className="text-2xl font-black">
          {game.homeScore}-{game.awayScore}
        </p>
        <p className="text-right text-sm font-black">{game.awayTeam}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[var(--muted)]">
        <span>{game.inning}</span>
        <span>{game.behindMinutes > 0 ? `${game.behindMinutes} min behind` : "On time"}</span>
      </div>
      {game.nextGame ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Next: {game.nextGame}</p> : null}
    </article>
  );
}

export function CrossroadsEquipmentGrid({ equipment }: { equipment: CrossroadsEquipmentEndpoint[] }) {
  const labels: Record<string, string> = {
    camera_security: "Camera/Security",
    lights: "Lights",
    network: "Network",
    scoreboard: "Scoreboard",
    speaker: "Speaker",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {equipment.map((endpoint) => (
        <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={endpoint.id}>
          <p className="text-sm font-black">{labels[endpoint.type] ?? endpoint.type}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{endpoint.providerKey}</p>
          <p className="mt-3 rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{endpoint.status}</p>
        </article>
      ))}
    </div>
  );
}

export function CrossroadsReadinessChecklist({ game }: { game: CrossroadsGame }) {
  const items: Array<[keyof CrossroadsGame["readiness"], string]> = [
    ["teamsArrived", "Teams arrived"],
    ["umpireArrived", "Umpire arrived"],
    ["scorekeeperReady", "Scorekeeper ready"],
    ["scoreboardReady", "Scoreboard ready"],
    ["fieldReady", "Field ready"],
  ];

  return (
    <div className="grid gap-2">
      {items.map(([key, label]) => (
        <div className="flex items-center justify-between rounded-lg bg-[var(--background)] p-3" key={key}>
          <span className="text-sm font-bold">{label}</span>
          <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${game.readiness[key] ? "bg-emerald-50 text-emerald-800" : "bg-amber-100 text-amber-950"}`}>
            {game.readiness[key] ? "Ready" : "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
}
