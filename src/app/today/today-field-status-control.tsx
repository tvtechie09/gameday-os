"use client";

import { useState, useTransition } from "react";
import { setFieldStatusAction } from "./actions";
import type { FieldStatus } from "@/lib/types";

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
  const [pending, startTransition] = useTransition();

  function updateStatus() {
    setMessage(null);
    startTransition(async () => {
      const result = await setFieldStatusAction(fieldId, selectedStatus);
      setMessage(result.message);
      if (result.ok) setSavedStatus(selectedStatus);
    });
  }

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(8rem,1fr)_auto] sm:items-center">
      <label className="sr-only" htmlFor={`today-field-status-${fieldId}`}>
        Change {fieldName} status
      </label>
      <select
        className="min-h-11 min-w-0 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        disabled={pending}
        id={`today-field-status-${fieldId}`}
        onChange={(event) => setSelectedStatus(event.target.value as FieldStatus)}
        value={selectedStatus}
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>{status.label}</option>
        ))}
      </select>
      <button
        className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending || selectedStatus === savedStatus}
        onClick={updateStatus}
        type="button"
      >
        {pending ? "Updating…" : "Apply"}
      </button>
      {message ? (
        <p className="text-xs font-semibold text-[var(--muted)] sm:col-span-2" role="status">{message}</p>
      ) : null}
    </div>
  );
}
