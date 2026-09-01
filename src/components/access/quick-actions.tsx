"use client";

import { useState, useTransition } from "react";
import { Bell, Clock, DoorOpen, Play } from "lucide-react";
import {
  delayGameAction,
  sendAnnouncementAction,
  setFieldStatusAction,
  startGameAction,
  type QuickActionResult,
} from "@/app/today/actions";
import type { QuickActionTargets } from "@/lib/services/venue-operations";
import { buttonStyles, QuickActionButton } from "@/components/ui/gameday-ui";

const META: Record<string, { label: string; Icon: typeof Play }> = {
  start: { label: "Start Game", Icon: Play },
  delay: { label: "Delay Game", Icon: Clock },
  announce: { label: "Send Announcement", Icon: Bell },
  field: { label: "Open / Close Field", Icon: DoorOpen },
};

// Capability-gated quick actions that act on real, server-resolved targets: the
// next game to start, the current game to delay, the venue's fields, and a
// venue announcement. Which actions render is decided server-side (`allowed`).
export function QuickActions({ allowed, targets }: Readonly<{ allowed: string[]; targets: QuickActionTargets }>) {
  const [open, setOpen] = useState<string | null>(null);
  const [result, setResult] = useState<QuickActionResult | null>(null);
  const [message, setMessage] = useState("");
  const [fieldId, setFieldId] = useState(targets.fields[0]?.id ?? "");
  const [confirmingFieldClose, setConfirmingFieldClose] = useState(false);
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
    setConfirmingFieldClose(false);
    setOpen((current) => (current === key ? null : key));
  }

  const panelClass = "mt-3 rounded-lg border border-[var(--line)] bg-white p-3";
  const confirmBtn = buttonStyles("primary");
  const selectedField = targets.fields.find((field) => field.id === fieldId);

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

      {open === "announce" ? (
        <div className={panelClass}>
          {targets.venueId ? (
            <div className="grid gap-2">
              <textarea
                className="ui-input min-h-24"
                placeholder="Message to fans at this venue (e.g. Parking lot B is full — use lot C)."
                value={message}
                maxLength={500}
                onChange={(event) => setMessage(event.target.value)}
              />
              <button className={confirmBtn + " w-fit"} disabled={pending || message.trim().length < 3} onClick={() => run(() => sendAnnouncementAction(targets.venueId!, message).then((r) => { if (r.ok) setMessage(""); return r; }))}>
                {pending ? "Sending…" : "Send announcement"}
              </button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-[var(--muted)]">No venue resolved for announcements.</p>
          )}
        </div>
      ) : null}

      {open === "field" ? (
        <div className={panelClass}>
          {targets.fields.length ? (
            <>
            <div className="flex flex-wrap items-center gap-2">
              <select className="ui-input min-w-48 flex-1" value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
                {targets.fields.map((field) => (
                  <option key={field.id} value={field.id}>{field.name} ({field.status})</option>
                ))}
              </select>
              <button className={confirmBtn} disabled={pending || !fieldId} onClick={() => run(() => setFieldStatusAction(fieldId, "open"))}>Open</button>
              <button className={buttonStyles("destructive")} disabled={pending || !fieldId} onClick={() => setConfirmingFieldClose(true)}>Close</button>
              {selectedField ? <span className="text-sm font-semibold text-[var(--muted)]">Currently {selectedField.status}</span> : null}
            </div>
            {confirmingFieldClose && selectedField ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
                <p className="text-sm font-black text-red-950">Close {selectedField.name}?</p>
                <p className="mt-1 text-sm font-semibold text-red-800">This changes public field status and may affect scheduled games.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button className={buttonStyles("destructive")} disabled={pending} onClick={() => run(() => setFieldStatusAction(fieldId, "closed"))}>Confirm closure</button>
                  <button className={buttonStyles("secondary")} disabled={pending} onClick={() => setConfirmingFieldClose(false)}>Keep field open</button>
                </div>
              </div>
            ) : null}
            </>
          ) : (
            <p className="text-sm font-semibold text-[var(--muted)]">No fields configured at this venue.</p>
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
