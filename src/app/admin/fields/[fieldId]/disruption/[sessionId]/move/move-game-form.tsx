"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { buttonStyles } from "@/components/ui/gameday-ui";
import { moveAffectedGameAction, type MoveAffectedGameResult } from "../../actions";

type FieldOption = { id: string; name: string; conflictMessage: string | null };

function formatDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}

export function MoveGameForm({
  fieldId,
  fieldName,
  gameLabel,
  sessionId,
  startTime,
  targetFields,
  timeZone,
}: {
  fieldId: string;
  fieldName: string;
  gameLabel: string;
  sessionId: string;
  startTime: string;
  targetFields: FieldOption[];
  timeZone: string;
}) {
  const [targetFieldId, setTargetFieldId] = useState("");
  const [newStartLocal, setNewStartLocal] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<MoveAffectedGameResult | null>(null);
  const [pending, startTransition] = useTransition();
  const target = targetFields.find((field) => field.id === targetFieldId) ?? null;
  const newStartTime = newStartLocal ? new Date(newStartLocal).toISOString() : startTime;
  const reviewPath = `/admin/fields/${fieldId}/disruption`;

  if (result?.ok) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950" role="status">
        <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
        <p className="mt-3 text-xs font-black uppercase tracking-[0.14em]">Game moved</p>
        <h2 className="mt-1 text-2xl font-black">{gameLabel}</h2>
        <p className="mt-3 text-base font-bold">{result.originalFieldName} → {result.newFieldName}</p>
        <p className="mt-2 text-sm font-semibold">Public schedule updated.</p>
        <Link className={buttonStyles("primary", "mt-5")} href={`${reviewPath}?moved=${encodeURIComponent(result.message)}`}>Return to disruption review</Link>
      </section>
    );
  }

  function submitMove() {
    if (!target) return;
    setResult(null);
    startTransition(async () => {
      let next: MoveAffectedGameResult;
      try {
        next = await moveAffectedGameAction({
          sessionId,
          originalFieldId: fieldId,
          targetFieldId: target.id,
          startTime: newStartLocal ? newStartTime : undefined,
        });
      } catch {
        next = { ok: false, message: "Couldn't move this game. Check your connection and try again." };
      }
      setResult(next);
      if (next.ok) setConfirming(false);
    });
  }

  return (
    <>
      <section className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--background)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Current</p>
            <p className="mt-2 text-xl font-black">{fieldName}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatDateTime(startTime, timeZone)}</p>
          </div>
          <label className="grid content-start gap-2">
            <span className="text-sm font-black">New field</span>
            <select className="ui-input min-h-12" onChange={(event) => { setTargetFieldId(event.target.value); setResult(null); }} value={targetFieldId}>
              <option value="">Select a field</option>
              {targetFields.map((field) => <option key={field.id} value={field.id}>{field.name}{field.conflictMessage ? " — conflict at current time" : ""}</option>)}
            </select>
            {target?.conflictMessage ? <span className="text-sm font-bold text-red-800">Conflict at the current start time: {target.conflictMessage}</span> : <span className="text-sm font-semibold text-[var(--muted)]">Conflicts are checked against the listed start time.</span>}
          </label>
        </div>

        <details className="mt-5 rounded-xl border border-[var(--line)]">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-black">Change start time (optional)</summary>
          <label className="grid gap-2 border-t border-[var(--line)] p-4">
            <span className="text-sm font-bold">New start date/time</span>
            <input className="ui-input min-h-12" onChange={(event) => setNewStartLocal(event.target.value)} type="datetime-local" value={newStartLocal} />
            <span className="text-sm font-semibold text-[var(--muted)]">Leave blank to preserve {formatDateTime(startTime, timeZone)}.</span>
          </label>
        </details>

        {result && !result.ok ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{result.message}</p> : null}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link className={buttonStyles("secondary")} href={reviewPath}>Keep {fieldName}</Link>
          <button className={buttonStyles("primary")} disabled={!target || pending || Boolean(target.conflictMessage && !newStartLocal)} onClick={() => setConfirming(true)} type="button">Review move</button>
        </div>
      </section>

      {confirming && target ? (
        <Modal
          description="This uses the existing conflict-checked schedule operation. It does not move any other game."
          footer={<div className="grid gap-2 sm:grid-cols-2"><button className={buttonStyles("secondary")} disabled={pending} onClick={() => setConfirming(false)} type="button">Keep {fieldName}</button><button className={buttonStyles("primary")} disabled={pending} onClick={submitMove} type="button">{pending ? "Moving…" : `Move to ${target.name}`}</button></div>}
          onClose={() => setConfirming(false)}
          open
          title="Move this game?"
        >
          {result && !result.ok ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-900" role="alert">{result.message}</p> : null}
          <div className="grid gap-4 text-sm">
            <div><p className="font-black">{gameLabel}</p></div>
            <dl className="grid gap-3 rounded-xl bg-[var(--background)] p-4 sm:grid-cols-2"><div><dt className="text-xs font-black uppercase text-[var(--muted)]">From</dt><dd className="mt-1 font-black">{fieldName}</dd></div><div><dt className="text-xs font-black uppercase text-[var(--muted)]">To</dt><dd className="mt-1 font-black">{target.name}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-black uppercase text-[var(--muted)]">Start time</dt><dd className="mt-1 font-black">{formatDateTime(startTime, timeZone)}{newStartLocal ? ` → ${formatDateTime(newStartTime, timeZone)}` : " (unchanged)"}</dd></div></dl>
            <p className="font-semibold text-[var(--muted)]">This updates the venue schedule and public game location. Existing schedule-change communication runs through the current best-effort channel.</p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
