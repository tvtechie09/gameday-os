"use client";

import { useState, useTransition } from "react";
import { Clock, Play } from "lucide-react";
import { delayGameAction, startGameAction, type QuickActionResult } from "@/app/today/actions";
import type { QuickActionTargets } from "@/lib/services/venue-operations";
import { buttonStyles, QuickActionButton } from "@/components/ui/gameday-ui";

const META: Record<string, { label: string; Icon: typeof Play }> = {
  start: { label: "Start Game", Icon: Play },
  delay: { label: "Delay Game", Icon: Clock },
};

// Today keeps only immediate game-state actions. Field state belongs in Fields
// and authored communications belong in Announcements.
export function QuickActions({ allowed, targets }: Readonly<{ allowed: string[]; targets: QuickActionTargets }>) {
  const [open, setOpen] = useState<string | null>(null);
  const [result, setResult] = useState<QuickActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (allowed.length === 0) {
    return <p className="text-sm font-semibold text-[var(--muted)]">Your role has no quick actions on this screen.</p>;
  }

  function run(fn: () => Promise<QuickActionResult>) {
    setResult(null);
    startTransition(async () => {
      const outcome = await fn();
      setResult(outcome);
      if (outcome.ok) setOpen(null);
    });
  }

  function toggle(key: string) {
    setResult(null);
    setOpen((current) => (current === key ? null : key));
  }

  const panelClass = "mt-3 rounded-lg border border-[var(--line)] bg-white p-3";
  const confirmBtn = buttonStyles("primary");

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {allowed.map((key) => {
          const meta = META[key];
          if (!meta) return null;
          const Icon = meta.Icon;
          const active = open === key;
          return (
            <QuickActionButton
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={active ? "bg-emerald-50 text-emerald-800 ring-emerald-500" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {meta.label}
            </QuickActionButton>
          );
        })}
      </div>

      {open === "start" ? (
        <div className={panelClass}>
          {targets.startGame ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Start <strong>{targets.startGame.label}</strong> on {targets.startGame.fieldName}?
              </p>
              <button className={confirmBtn} disabled={pending} onClick={() => run(() => startGameAction(targets.startGame!.sessionId))}>
                {pending ? "Starting…" : "Start now"}
              </button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-[var(--muted)]">No scheduled game is ready to start at this venue.</p>
          )}
        </div>
      ) : null}

      {open === "delay" ? (
        <div className={panelClass}>
          {targets.delayGame ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Delay <strong>{targets.delayGame.label}</strong> — flag {targets.delayGame.fieldName} delayed?
              </p>
              <button className={buttonStyles("primary", "bg-amber-600 hover:bg-amber-700")} disabled={pending} onClick={() => run(() => delayGameAction(targets.delayGame!.fieldId))}>
                {pending ? "Delaying…" : "Delay game"}
              </button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-[var(--muted)]">No live or upcoming game to delay right now.</p>
          )}
        </div>
      ) : null}

      {result ? (
        <p role="status" className={"mt-3 rounded-md px-3 py-2 text-sm font-bold " + (result.ok ? "bg-emerald-500/10 text-emerald-800" : "bg-red-500/10 text-red-800")}>
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
