"use client";

import { useState } from "react";
import type { DemoScoreboardAction } from "@/lib/services/session-demo";
import type { Session } from "@/lib/types";
import { runDemoScoreboardAction, type DemoScoreboardActionResult } from "@/app/admin/scoreboards/demo-actions";

type DemoScoreboardControlsProps = {
  session: Session | null;
};

const demoActions: Array<{ action: DemoScoreboardAction; label: string; tone: "primary" | "secondary" | "danger" }> = [
  { action: "start", label: "Start Demo", tone: "primary" },
  { action: "home_plus_one", label: "Home +1", tone: "primary" },
  { action: "away_plus_one", label: "Away +1", tone: "primary" },
  { action: "next_period", label: "Next Inning/Period", tone: "secondary" },
  { action: "reset", label: "Reset Demo", tone: "danger" },
];

function stateFromSession(session: Session | null) {
  return session
    ? {
      awayScore: session.awayScore,
      gameStatus: session.gameStatus,
      homeScore: session.homeScore,
      inning: session.inning,
      inningHalf: session.inningHalf,
    }
    : null;
}

function buttonClass(tone: "primary" | "secondary" | "danger") {
  if (tone === "danger") {
    return "border border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "primary") {
    return "bg-[var(--accent)] text-white";
  }

  return "border border-[var(--line)] bg-white text-[var(--foreground)]";
}

export function DemoScoreboardControls({ session }: DemoScoreboardControlsProps) {
  const [scoreState, setScoreState] = useState(() => stateFromSession(session));
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isLocked = !session?.isDemo;

  async function runAction(action: DemoScoreboardAction) {
    if (!session || isLocked || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result: DemoScoreboardActionResult = await runDemoScoreboardAction(session.id, action).catch((error: unknown) => {
      console.error("Failed to run demo scoreboard action", error);
      return {
        error: error instanceof Error ? error.message : "Unable to run demo scoreboard action.",
      };
    });

    if (result.error) {
      setMessage(result.error);
      setIsSaving(false);
      return;
    }

    if (result.session) {
      setScoreState(stateFromSession(result.session));
    }

    setMessage("Demo scoreboard updated. Public displays refresh within the polling interval.");
    setIsSaving(false);
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Scoreboard Demo Mode</p>
          <h2 className="mt-1 text-xl font-black">Demo score controls</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            These controls only write to sessions marked as demo. Real sessions stay locked.
          </p>
        </div>
        <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${session?.isDemo ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-slate-100 text-slate-700"}`}>
          {session?.isDemo ? "Demo Session" : "Real Session Locked"}
        </span>
      </div>

      {scoreState ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-[var(--background)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Score</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{scoreState.homeScore}-{scoreState.awayScore}</p>
          </div>
          <div className="rounded-lg bg-[var(--background)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Period</p>
            <p className="mt-1 text-2xl font-black capitalize">{scoreState.inningHalf} {scoreState.inning}</p>
          </div>
          <div className="rounded-lg bg-[var(--background)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Status</p>
            <p className="mt-1 text-2xl font-black capitalize">{scoreState.gameStatus}</p>
          </div>
          <div className="rounded-lg bg-[var(--background)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Polling</p>
            <p className="mt-1 text-2xl font-black">5s</p>
          </div>
        </div>
      ) : (
        <p className="ui-empty mt-5">Select a session to enable demo controls.</p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {demoActions.map((demoAction) => (
          <button
            className={`min-h-12 rounded-lg px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass(demoAction.tone)}`}
            disabled={!session || isLocked || isSaving}
            key={demoAction.action}
            onClick={() => void runAction(demoAction.action)}
            type="button"
          >
            {demoAction.label}
          </button>
        ))}
      </div>

      {isLocked && session ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          This is a real session. Mark it as a demo session before using demo score controls.
        </p>
      ) : null}
      {message ? <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm font-bold text-[var(--accent-strong)]">{message}</p> : null}
    </section>
  );
}
