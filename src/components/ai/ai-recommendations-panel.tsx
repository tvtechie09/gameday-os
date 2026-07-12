"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AiRecommendation } from "@/lib/ai-recommendations";

type AiRecommendationsPanelProps = {
  compact?: boolean;
  recommendations: AiRecommendation[];
  title?: string;
};

const severityStyles = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  urgent: "border-red-200 bg-red-50 text-red-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

const severityLabel = {
  info: "Info",
  urgent: "Urgent",
  warning: "Warning",
};

export function AiRecommendationsPanel({ compact = false, recommendations, title = "AI Venue Command Suggestions" }: AiRecommendationsPanelProps) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, "reviewed" | "dismissed">>({});
  const visibleRecommendations = useMemo(
    () => recommendations.filter((recommendation) => localStatuses[recommendation.id] !== "dismissed"),
    [localStatuses, recommendations],
  );

  function markReviewed(id: string) {
    setLocalStatuses((current) => ({ ...current, [id]: "reviewed" }));
  }

  function dismiss(id: string) {
    setLocalStatuses((current) => ({ ...current, [id]: "dismissed" }));
  }

  return (
    <section className={`rounded-xl border border-[var(--line)] bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Rules-based assistant</p>
          <h2 className="mt-1 text-2xl font-black">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Internal recommendation engine only. No OpenAI API calls, no paid AI integration, and no natural-language chat in v1.
          </p>
        </div>
        <Link href="/admin/ai" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white">
          Open AI Assistant
        </Link>
      </div>

      {visibleRecommendations.length === 0 ? (
        <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
          <p className="text-sm font-black">No open suggestions right now.</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">GameDay OS did not find urgent operations, scheduling, sponsor, scoreboard, or system-health issues in the current context.</p>
        </div>
      ) : (
        <div className={`mt-5 grid gap-3 ${compact ? "" : "xl:grid-cols-2"}`}>
          {visibleRecommendations.map((recommendation) => {
            const reviewed = localStatuses[recommendation.id] === "reviewed";

            return (
              <article className={`rounded-lg border p-4 ${severityStyles[recommendation.severity]}`} key={recommendation.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-white/75 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">{severityLabel[recommendation.severity]}</span>
                      <span className="rounded-md bg-white/75 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">{recommendation.recommendationType.replace("_", " ")}</span>
                      {reviewed ? <span className="rounded-md bg-white/75 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">Reviewed</span> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-black leading-tight">{recommendation.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6">{recommendation.message}</p>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] opacity-70">Source: {recommendation.source}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {recommendation.actions.map((action) => (
                    action.href ? (
                      <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-slate-950 shadow-sm" href={action.href} key={`${recommendation.id}-${action.actionType}-${action.label}`}>
                        {action.label}
                      </Link>
                    ) : null
                  ))}
                  <button className="min-h-11 rounded-lg border border-current bg-white/70 px-4 text-sm font-black" onClick={() => markReviewed(recommendation.id)} type="button">
                    Mark Reviewed
                  </button>
                  <button className="min-h-11 rounded-lg border border-current bg-transparent px-4 text-sm font-black" onClick={() => dismiss(recommendation.id)} type="button">
                    Dismiss
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
