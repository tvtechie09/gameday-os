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
        className="ui-input min-w-0 font-bold"
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
    </div>
  );
}
