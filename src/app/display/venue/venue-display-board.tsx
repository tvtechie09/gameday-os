"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { AlertType, FieldStatus, Session } from "@/lib/types";
import type { VenueDisplayPayload } from "@/lib/services/venue-display";

type VenueDisplayBoardProps = {
  apiPath: string;
  compact?: boolean;
  initialPayload: VenueDisplayPayload;
  showSponsor?: boolean;
  theme?: "dark" | "light";
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatScore(session: Session | null) {
  if (!session) {
    return "No score";
  }

  return `${session.homeTeam} ${session.homeScore} - ${session.awayScore} ${session.awayTeam}`;
}

function alertLabel(alertType: AlertType) {
  return `${alertType.replace("_", " ")} alert`.toUpperCase();
}

function alertTone(alertType: AlertType, dark: boolean) {
  if (alertType === "emergency" || alertType === "field_closure") {
    return dark ? "border-red-400 bg-red-500/20 text-red-50" : "border-red-300 bg-red-50 text-red-950";
  }

  if (alertType === "weather" || alertType === "delay" || alertType === "parking") {
    return dark ? "border-amber-300 bg-amber-400/20 text-amber-50" : "border-amber-300 bg-amber-50 text-amber-950";
  }

  return dark ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-950";
}

function fieldStatusLabel(status: FieldStatus) {
  const labels: Record<FieldStatus, string> = {
    active: "Active",
    closed: "Closed",
    delayed: "Delayed",
    maintenance: "Maintenance",
    open: "Open",
  };

  return labels[status];
}

function fieldStatusClass(status: FieldStatus, dark: boolean) {
  if (status === "active") return "bg-green-600 text-white";
  if (status === "delayed") return dark ? "bg-amber-300 text-amber-950" : "bg-amber-100 text-amber-950";
  if (status === "closed") return dark ? "bg-red-400 text-red-950" : "bg-red-100 text-red-900";
  if (status === "maintenance") return dark ? "bg-slate-300 text-slate-950" : "bg-slate-200 text-slate-900";
  return dark ? "bg-emerald-300 text-emerald-950" : "bg-emerald-50 text-emerald-800";
}

export function VenueDisplayBoard({
  apiPath,
  compact = false,
  initialPayload,
  showSponsor = true,
  theme = "dark",
}: VenueDisplayBoardProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialPayload.generatedAt);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dark = theme === "dark";
  const containerClass = dark ? "bg-black text-white" : "bg-white text-slate-950";
  const panelClass = dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-slate-50";
  const mutedClass = dark ? "text-white/65" : "text-slate-600";
  const sponsors = showSponsor ? payload.sponsors.slice(0, compact ? 3 : 6) : [];
  const fieldColumns = compact ? "xl:grid-cols-4" : "lg:grid-cols-2 2xl:grid-cols-4";
  const logoUrl = payload.venue?.logoUrl ?? payload.organization?.logoUrl;
  const venueName = payload.venue?.name ?? "Venue unavailable";
  const activeFieldCount = useMemo(() => payload.fields.filter((item) => item.currentSession).length, [payload.fields]);
  const delayedOrClosedCount = useMemo(() => payload.fields.filter((item) => item.field.status === "delayed" || item.field.status === "closed").length, [payload.fields]);

  useEffect(() => {
    let cancelled = false;

    async function refreshDisplay() {
      try {
        const response = await fetch(apiPath, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Venue display refresh failed with ${response.status}.`);
        }

        const nextPayload = await response.json() as VenueDisplayPayload;

        if (!cancelled) {
          setPayload(nextPayload);
          setLastUpdatedAt(nextPayload.generatedAt);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to refresh venue display", error);
          setErrorMessage("Refresh paused.");
        }
      }
    }

    const interval = window.setInterval(refreshDisplay, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiPath]);

  return (
    <main className={`min-h-screen ${containerClass}`}>
      <section className={`mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 p-4 sm:p-6 lg:p-8 ${compact ? "lg:gap-3 lg:p-5" : ""}`}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {logoUrl ? (
              <Image alt="" className="h-16 w-16 rounded-xl bg-white object-contain p-2 sm:h-20 sm:w-20" height={80} src={logoUrl} unoptimized width={80} />
            ) : null}
            <div className="min-w-0">
              <p className={`text-sm font-black uppercase tracking-[0.22em] ${mutedClass}`}>{payload.organization?.name ?? "GameDay OS"}</p>
              <h1 className="mt-1 text-4xl font-black leading-none sm:text-6xl lg:text-7xl">{venueName}</h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            <Metric label="Fields" panelClass={panelClass} value={payload.fields.length} />
            <Metric label="Live" panelClass={panelClass} value={activeFieldCount} />
            <Metric label="Issues" panelClass={panelClass} value={delayedOrClosedCount} />
          </div>
        </header>

        {payload.alerts.length > 0 ? (
          <section>
            <p className={`mb-3 text-sm font-black uppercase tracking-[0.2em] ${mutedClass}`}>Venue Status and Announcements</p>
            <div className={`grid gap-3 ${compact ? "lg:grid-cols-2" : "xl:grid-cols-2"}`}>
              {payload.alerts.slice(0, compact ? 2 : 4).map((alert) => (
                <article className={`rounded-2xl border-2 p-4 shadow-xl sm:p-5 ${alertTone(alert.alertType, dark)}`} key={alert.id}>
                  <p className="text-xs font-black uppercase tracking-[0.2em]">{alertLabel(alert.alertType)} · {alert.alertPriority.toUpperCase()}</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">{alert.title}</h2>
                  {!compact ? <p className="mt-2 text-base font-semibold leading-7">{alert.message}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={`grid flex-1 gap-4 ${compact ? "xl:grid-cols-[1.4fr_0.8fr]" : "2xl:grid-cols-[1.4fr_0.85fr]"}`}>
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className={`text-sm font-black uppercase tracking-[0.2em] ${mutedClass}`}>Field Grid</p>
                <h2 className="mt-1 text-2xl font-black sm:text-4xl">Live venue status</h2>
              </div>
              <p className={`text-sm font-bold uppercase tracking-[0.16em] ${mutedClass}`}>Auto-refresh 10s</p>
            </div>
            <div className={`mt-4 grid gap-3 ${fieldColumns}`}>
              {payload.fields.length > 0 ? payload.fields.map((item) => (
                <article className={`rounded-2xl border p-4 shadow-lg ${panelClass}`} key={item.field.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-2xl font-black leading-tight">{item.field.name}</h3>
                      <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.14em] ${fieldStatusClass(item.field.status, dark)}`}>
                        {fieldStatusLabel(item.field.status)}
                      </span>
                    </div>
                    {(item.field.status === "delayed" || item.field.status === "closed") ? (
                      <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
                        {item.field.status}
                      </span>
                    ) : null}
                  </div>
                  <div className={`mt-4 rounded-xl border p-3 ${panelClass}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${mutedClass}`}>Current</p>
                    {item.currentSession ? (
                      <>
                        <p className="mt-1 text-lg font-black leading-tight">{item.currentSession.title}</p>
                        <p className="mt-2 text-2xl font-black tabular-nums">{formatScore(item.currentSession)}</p>
                      </>
                    ) : (
                      <p className={`mt-1 text-sm font-bold ${mutedClass}`}>No active session</p>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${mutedClass}`}>Next</p>
                    {item.nextSession ? (
                      <p className="mt-1 text-sm font-bold">
                        {formatTime(item.nextSession.startTime)} · {item.nextSession.title}
                      </p>
                    ) : (
                      <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>No upcoming session</p>
                    )}
                  </div>
                </article>
              )) : (
                <div className={`rounded-2xl border p-8 text-center ${panelClass}`}>
                  <p className="text-3xl font-black">No fields yet. Add your first field.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <section className={`rounded-2xl border p-4 shadow-lg ${panelClass}`}>
              <p className={`text-sm font-black uppercase tracking-[0.2em] ${mutedClass}`}>Today&apos;s Schedule</p>
              <div className="mt-4 grid gap-3">
                {payload.schedule.length > 0 ? payload.schedule.slice(0, compact ? 5 : 8).map((group) => (
                  <article className={`rounded-xl border p-3 ${panelClass}`} key={group.field.id}>
                    <h3 className="text-lg font-black">{group.field.name}</h3>
                    <div className="mt-2 grid gap-2">
                      {group.sessions.slice(0, compact ? 2 : 4).map((session) => (
                        <p className={`text-sm font-bold ${mutedClass}`} key={session.id}>
                          <span className="text-current">{formatTime(session.startTime)}</span> · {session.homeTeam} vs. {session.awayTeam}
                        </p>
                      ))}
                    </div>
                  </article>
                )) : (
                  <p className={`rounded-xl border p-4 text-sm font-bold ${panelClass} ${mutedClass}`}>No sessions today. Import or create a session.</p>
                )}
              </div>
            </section>

            {sponsors.length > 0 ? (
              <section className={`rounded-2xl border p-4 shadow-lg ${panelClass}`}>
                <p className={`text-sm font-black uppercase tracking-[0.2em] ${mutedClass}`}>Sponsors</p>
                <div className="mt-4 grid gap-3">
                  {sponsors.map(({ assignment, sponsor }) => (
                    <article className={`flex items-center gap-3 rounded-xl border p-3 ${panelClass}`} key={assignment.id}>
                      {sponsor.logoUrl ? (
                        <Image alt="" className="h-14 w-20 rounded-lg bg-white object-contain p-2" height={56} src={sponsor.logoUrl} unoptimized width={80} />
                      ) : null}
                      <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${mutedClass}`}>{assignment.placementLabel}</p>
                        <p className="truncate text-lg font-black">{sponsor.name}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </section>

        <footer className={`flex flex-col gap-2 text-xs font-black uppercase tracking-[0.16em] sm:flex-row sm:items-center sm:justify-between ${mutedClass}`}>
          <p>{errorMessage ?? "Live venue display"}</p>
          <p>Updated {formatTime(lastUpdatedAt)} · Powered by GameDay OS</p>
        </footer>
      </section>
    </main>
  );
}

function Metric({ label, panelClass, value }: { label: string; panelClass: string; value: number }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${panelClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none tabular-nums sm:text-4xl">{value}</p>
    </div>
  );
}
