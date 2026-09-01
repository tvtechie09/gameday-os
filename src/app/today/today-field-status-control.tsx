"use client";

import { useState, useTransition } from "react";
import { setFieldStatusAction } from "./actions";
import type { FieldStatus } from "@/lib/types";
import { buttonStyles } from "@/components/ui/gameday-ui";

const statuses: Array<{ value: FieldStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "active", label: "Active" },
  { value: "delayed", label: "Delayed" },
  { value: "closed", label: "Closed" },
  { value: "maintenance", label: "Maintenance" },
];

export function TodayFieldStatusControl({
  fieldId,
  fieldName,
  initialStatus,
}: {
  fieldId: string;
  fieldName: string;
  initialStatus: FieldStatus;
}) {
  const [selectedStatus, setSelectedStatus] = useState<FieldStatus>(initialStatus);
  const [savedStatus, setSavedStatus] = useState<FieldStatus>(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveStatus() {
    setMessage(null);
    setConfirming(false);
    startTransition(async () => {
      const result = await setFieldStatusAction(fieldId, selectedStatus);
      setMessage(result.message);
      if (result.ok) setSavedStatus(selectedStatus);
    });
  }

  function updateStatus() {
    if (selectedStatus === "closed" || selectedStatus === "maintenance") {
      setConfirming(true);
      return;
    }
    saveStatus();
  }

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(8rem,1fr)_auto] sm:items-center">
      <label className="sr-only" htmlFor={`today-field-status-${fieldId}`}>
        Change {fieldName} status
      </label>
      <select
        className="ui-input min-w-0 font-bold"
        disabled={pending}
        id={`today-field-status-${fieldId}`}
        onChange={(event) => { setSelectedStatus(event.target.value as FieldStatus); setConfirming(false); setMessage(null); }}
        value={selectedStatus}
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>{status.label}</option>
        ))}
      </select>
      <button
        className={buttonStyles("primary", "bg-[var(--black-soft)] hover:bg-black")}
        disabled={pending || selectedStatus === savedStatus}
        onClick={updateStatus}
        type="button"
      >
        {pending ? "Updating…" : "Apply"}
      </button>
      {message ? (
        <p className="text-sm font-semibold text-[var(--muted)] sm:col-span-2" role="status">{message}</p>
      ) : null}
      {confirming ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:col-span-2" role="alert">
          <p className="text-sm font-black text-red-950">{selectedStatus === "maintenance" ? `Put ${fieldName} in maintenance?` : `Close ${fieldName}?`}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-red-800">This updates public field status and may affect scheduled games.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button className={buttonStyles("destructive")} disabled={pending} onClick={saveStatus} type="button">Confirm {selectedStatus === "maintenance" ? "maintenance" : "closure"}</button>
            <button className={buttonStyles("secondary")} disabled={pending} onClick={() => { setConfirming(false); setSelectedStatus(savedStatus); }} type="button">Keep current status</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
