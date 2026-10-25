"use client";

import { useActionState } from "react";
import { TRAINER_DISPATCH_NOTICE } from "@/lib/services/venue-service-request-core";
import { createPublicServiceRequestAction, type PublicServiceRequestState } from "./actions";

const initialState: PublicServiceRequestState = { ok: false };

function Result({ state }: { state: PublicServiceRequestState }) {
  if (state.ok) {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-900" role="status">
        Request sent. Reference: {state.requestReference}
      </p>
    );
  }
  return state.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900" role="alert">{state.error}</p> : null;
}

function ContextFields({ fieldId, sessionId }: { fieldId: string; sessionId: string | null }) {
  return (
    <>
      <input name="field_id" type="hidden" value={fieldId} />
      <input name="session_id" type="hidden" value={sessionId ?? ""} />
    </>
  );
}

export function VenueServiceRequestForm({ fieldId, sessionId }: { fieldId: string; sessionId: string | null }) {
  const [trainerState, trainerAction, trainerPending] = useActionState(createPublicServiceRequestAction, initialState);
  const [maintenanceState, maintenanceAction, maintenancePending] = useActionState(createPublicServiceRequestAction, initialState);

  return (
    <div className="grid gap-4">
      <form action={trainerAction} className="rounded-lg border-2 border-red-200 bg-red-50 p-5">
        <ContextFields fieldId={fieldId} sessionId={sessionId} />
        <input name="request_type" type="hidden" value="TRAINER_ASSISTANCE" />
        <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Trainer assistance</p>
        <h2 className="mt-2 text-xl font-black">Send a trainer to this field</h2>
        <p className="mt-2 text-sm leading-6 text-red-950">{TRAINER_DISPATCH_NOTICE}</p>
        <label className="mt-4 flex min-h-12 items-center gap-3 rounded-lg border border-red-300 bg-white px-3 text-sm font-black text-red-950">
          <input className="size-5" name="operational_impact" type="checkbox" value="GAME_CANNOT_START_CONTINUE" />
          Game cannot start or continue
        </label>
        <label className="mt-4 grid gap-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-red-800">Your name (optional)</span>
          <input className="min-h-11 rounded-lg border border-red-200 bg-white px-3 text-sm" maxLength={120} name="requester_name" />
        </label>
        <button className="mt-4 min-h-12 w-full rounded-lg bg-red-700 px-4 text-sm font-black text-white disabled:opacity-60" disabled={trainerPending || trainerState.ok} type="submit">
          {trainerPending ? "Sending…" : trainerState.ok ? "Trainer request sent" : "Send trainer request"}
        </button>
        <div className="mt-3"><Result state={trainerState} /></div>
      </form>

      <form action={maintenanceAction} className="rounded-lg border border-[var(--line)] bg-white p-5">
        <ContextFields fieldId={fieldId} sessionId={sessionId} />
        <input name="request_type" type="hidden" value="MAINTENANCE_FIELD_ISSUE" />
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Maintenance / field issue</p>
        <h2 className="mt-2 text-xl font-black">Report an operational problem</h2>
        <label className="mt-4 grid gap-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Operational impact</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue="NEEDS_ATTENTION" name="severity">
            <option value="SAFETY">Safety concern</option>
            <option value="NEEDS_ATTENTION">Needs attention</option>
            <option value="ROUTINE">Routine</option>
          </select>
        </label>
        <label className="mt-3 flex min-h-12 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-black text-red-950">
          <input className="size-5" name="operational_impact" type="checkbox" value="GAME_CANNOT_START_CONTINUE" />
          Game cannot start or continue
        </label>
        <label className="mt-3 grid gap-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">What is happening? (optional)</span>
          <textarea className="min-h-24 rounded-lg border border-[var(--line)] px-3 py-2 text-sm" maxLength={1000} name="note" placeholder="Short operational note" />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Your name (optional)</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" maxLength={120} name="requester_name" />
        </label>
        <button className="mt-4 min-h-12 w-full rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white disabled:opacity-60" disabled={maintenancePending || maintenanceState.ok} type="submit">
          {maintenancePending ? "Sending…" : maintenanceState.ok ? "Field issue sent" : "Send field issue"}
        </button>
        <div className="mt-3"><Result state={maintenanceState} /></div>
      </form>
    </div>
  );
}
