"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ScoreboardPayload } from "@/lib/services/scoreboard-display";

type ScoreboardDisplayProps = {
  apiPath: string;
  compact?: boolean;
  initialPayload: ScoreboardPayload;
  showSponsor?: boolean;
  theme?: "dark" | "light";
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatInning(payload: ScoreboardPayload) {
  const session = payload.session;

  if (!session) {
    return "No game";
  }

  if (session.sportType === "baseball" || session.sportType === "softball") {
    return `${session.inningHalf === "top" ? "Top" : "Bottom"} ${session.inning}`;
  }

  return `Period ${session.inning}`;
}

function statusLabel(payload: ScoreboardPayload) {
  if (!payload.session) {
    return "No session";
  }

  if (payload.displayMode === "next" && payload.session.status === "scheduled") {
    return "Next Game";
  }

  return payload.session.gameStatus;
}

export function ScoreboardDisplay({
  apiPath,
  compact = false,
  initialPayload,
  showSponsor = true,
  theme = "dark",
}: ScoreboardDisplayProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialPayload.generatedAt);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const session = payload.session;
  const dark = theme === "dark";
  const containerClass = dark ? "bg-black text-white" : "bg-white text-slate-950";
  const panelClass = dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-slate-50";
  const mutedClass = dark ? "text-white/65" : "text-slate-600";
  const sponsor = showSponsor ? payload.sponsor : null;

  useEffect(() => {
    let cancelled = false;

    async function loadScoreboard() {
      try {
        const response = await fetch(apiPath, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Scoreboard refresh failed with ${response.status}.`);
        }

        const nextPayload = await response.json() as ScoreboardPayload;

        if (!cancelled) {
          setPayload(nextPayload);
          setLastUpdatedAt(nextPayload.generatedAt);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to refresh scoreboard", error);
          setErrorMessage("Scoreboard refresh paused.");
        }
      }
    }

    const interval = window.setInterval(loadScoreboard, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiPath]);

  return (
    <main className={`min-h-screen ${containerClass}`}>
      <section className={`mx-auto flex min-h-screen w-full max-w-[1800px] flex-col justify-between gap-4 p-4 sm:p-6 lg:p-8 ${compact ? "xl:max-w-6xl" : ""}`}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className={`text-sm font-black uppercase tracking-[0.22em] ${mutedClass}`}>{payload.venue?.name ?? "GameDay OS"}</p>
            <h1 className="mt-1 text-3xl font-black leading-none sm:text-5xl lg:text-6xl">{payload.field?.name ?? "Field unavailable"}</h1>
            {session ? <p className={`mt-2 text-lg font-bold sm:text-2xl ${mutedClass}`}>{session.title} · {formatTime(session.startTime)}</p> : null}
          </div>
          <div className={`w-fit rounded-xl border px-4 py-3 text-right ${panelClass}`}>
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${mutedClass}`}>Status</p>
            <p className="mt-1 text-2xl font-black uppercase sm:text-4xl">{statusLabel(payload)}</p>
          </div>
        </header>

        {session ? (
          <section className={`grid flex-1 items-center gap-4 ${compact ? "lg:grid-cols-[1fr_auto_1fr]" : "lg:grid-cols-[1fr_0.85fr_1fr]"}`}>
            <TeamPanel label="Home" mutedClass={mutedClass} panelClass={panelClass} score={session.homeScore} team={session.homeTeam} />
            <section className={`rounded-2xl border p-4 text-center shadow-2xl sm:p-6 ${panelClass}`}>
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${mutedClass}`}>Game Clock</p>
              <p className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl lg:text-7xl">{formatInning(payload)}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <StatPill label="Balls" value={session.balls} />
                <StatPill label="Strikes" value={session.strikes} />
                <StatPill label="Outs" value={session.outs} />
              </div>
              <p className={`mt-5 text-sm font-bold uppercase tracking-[0.16em] ${mutedClass}`}>{session.sportType}</p>
            </section>
            <TeamPanel label="Away" mutedClass={mutedClass} panelClass={panelClass} score={session.awayScore} team={session.awayTeam} />
          </section>
        ) : (
          <section className={`grid flex-1 place-items-center rounded-2xl border p-8 text-center ${panelClass}`}>
            <div>
              <p className={`text-sm font-black uppercase tracking-[0.2em] ${mutedClass}`}>Scoreboard standby</p>
              <h2 className="mt-3 text-4xl font-black sm:text-6xl">No active or upcoming session</h2>
            </div>
          </section>
        )}

        <footer className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          {sponsor ? (
            <section className={`flex items-center gap-4 rounded-xl border p-3 ${panelClass}`}>
              {sponsor.sponsor.logoUrl ? (
                <Image alt="" className="h-14 w-24 rounded-lg bg-white object-contain p-2" height={56} src={sponsor.sponsor.logoUrl} unoptimized width={96} />
              ) : null}
              <div className="min-w-0">
                <p className={`text-xs font-black uppercase tracking-[0.18em] ${mutedClass}`}>{sponsor.placementLabel}</p>
                <p className="truncate text-xl font-black sm:text-2xl">{sponsor.sponsor.name}</p>
              </div>
            </section>
          ) : (
            <div />
          )}
          <div className={`text-xs font-bold uppercase tracking-[0.16em] ${mutedClass}`}>
            {errorMessage ? <p>{errorMessage}</p> : null}
            <p>Updated {formatTime(lastUpdatedAt)} · GameDay OS</p>
          </div>
        </footer>
      </section>
    </main>
  );
}

function TeamPanel({
  label,
  mutedClass,
  panelClass,
  score,
  team,
}: {
  label: string;
  mutedClass: string;
  panelClass: string;
  score: number;
  team: string;
}) {
  return (
    <article className={`grid min-h-64 rounded-2xl border p-5 shadow-2xl sm:min-h-80 sm:p-7 lg:min-h-[32rem] ${panelClass}`}>
      <div>
        <p className={`text-sm font-black uppercase tracking-[0.22em] ${mutedClass}`}>{label}</p>
        <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">{team}</h2>
      </div>
      <p className="self-end text-[9rem] font-black leading-none tracking-normal sm:text-[14rem] lg:text-[18rem]">{score}</p>
    </article>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black/20 p-3 text-center ring-1 ring-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none sm:text-5xl">{value}</p>
    </div>
  );
}
