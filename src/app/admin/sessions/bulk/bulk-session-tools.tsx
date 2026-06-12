"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkDeleteSessionsAction, bulkUpdateSessionsAction, duplicateSessionsAction } from "./actions";
import type { Field, Session, Venue } from "@/lib/types";

type ToolMode = "update" | "duplicate" | "delete";

type FilterState = {
  venueId: string;
  fieldId: string;
  date: string;
  status: string;
};

type MessageState = {
  kind: "success" | "error";
  text: string;
} | null;

const defaultFilters: FilterState = {
  venueId: "",
  fieldId: "",
  date: "",
  status: "",
};

function toDateInput(value: string) {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getFieldVenueId(fieldId: string, fieldsById: Map<string, Field>) {
  return fieldsById.get(fieldId)?.venueId ?? "";
}

function filterSessions(sessions: Session[], filters: FilterState, fieldsById: Map<string, Field>) {
  return sessions.filter((session) => {
    const field = fieldsById.get(session.fieldId);

    if (filters.venueId && field?.venueId !== filters.venueId) {
      return false;
    }

    if (filters.fieldId && session.fieldId !== filters.fieldId) {
      return false;
    }

    if (filters.date && toDateInput(session.startTime) !== filters.date) {
      return false;
    }

    if (filters.status && session.status !== filters.status) {
      return false;
    }

    return true;
  });
}

function buildSessionIds(sessions: Session[]) {
  return sessions.map((session) => session.id).join(",");
}

function getWarnings(mode: ToolMode, sessions: Session[], extra?: { sourceDate?: string; targetDate?: string; shiftMinutes?: string }) {
  const warnings: string[] = [];

  if (sessions.length === 0) {
    warnings.push("No sessions match the current preview filters.");
    return warnings;
  }

  const activeCount = sessions.filter((session) => session.status === "active").length;
  const finalCount = sessions.filter((session) => session.status === "final").length;

  if (activeCount > 0) {
    warnings.push(`${activeCount} active session${activeCount === 1 ? "" : "s"} will be affected.`);
  }

  if (finalCount > 0 && mode !== "duplicate") {
    warnings.push(`${finalCount} final session${finalCount === 1 ? "" : "s"} will be changed.`);
  }

  if (mode === "duplicate") {
    warnings.push("Duplicated sessions reset scores, inning, count, outs, and status to scheduled.");
    if (extra?.sourceDate && extra.targetDate && extra.sourceDate === extra.targetDate) {
      warnings.push("Source and target date are the same, which may create duplicate games on one day.");
    }
  }

  if (mode === "delete") {
    warnings.push("Bulk delete is permanent and removes matching sessions from public field pages.");
  }

  if (mode === "update" && extra?.shiftMinutes && Number(extra.shiftMinutes) !== 0) {
    warnings.push(`Start times will shift by ${extra.shiftMinutes} minutes.`);
  }

  return warnings;
}

function SessionPreview({
  sessions,
  fieldsById,
  venuesById,
}: {
  sessions: Session[];
  fieldsById: Map<string, Field>;
  venuesById: Map<string, Venue>;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black">Preview</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{sessions.length} affected session{sessions.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      {sessions.length > 0 ? (
        <div className="mt-4 grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
          {sessions.map((session) => {
            const field = fieldsById.get(session.fieldId);
            const venue = field ? venuesById.get(field.venueId) : null;
            return (
              <article key={session.id} className="rounded-lg bg-[var(--background)] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-black">{session.title}</h4>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {venue?.name ?? "Venue unavailable"} · {field?.name ?? "Field unavailable"}
                    </p>
                    <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                      {session.sportType}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{formatSessionTime(session.startTime)}</p>
                  </div>
                  <span className="w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                    {session.status}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
          Adjust filters to preview matching sessions before running a bulk action.
        </p>
      )}
    </div>
  );
}

function FilterControls({
  filters,
  fields,
  venues,
  onChange,
  dateLabel = "Date",
}: {
  filters: FilterState;
  fields: Field[];
  venues: Venue[];
  onChange: (filters: FilterState) => void;
  dateLabel?: string;
}) {
  const visibleFields = filters.venueId ? fields.filter((field) => field.venueId === filters.venueId) : fields;

  function updateFilter(key: keyof FilterState, value: string) {
    onChange({
      ...filters,
      [key]: value,
      ...(key === "venueId" ? { fieldId: "" } : {}),
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-2">
        <span className="text-sm font-bold">Venue</span>
        <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateFilter("venueId", event.target.value)} value={filters.venueId}>
          <option value="">All venues</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-bold">Field</span>
        <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateFilter("fieldId", event.target.value)} value={filters.fieldId}>
          <option value="">All fields</option>
          {visibleFields.map((field) => (
            <option key={field.id} value={field.id}>{field.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-bold">{dateLabel}</span>
        <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateFilter("date", event.target.value)} type="date" value={filters.date} />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-bold">Status</span>
        <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
          <option value="">Any status</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="final">Final</option>
        </select>
      </label>
    </div>
  );
}

export function BulkSessionTools({ venues, fields, sessions }: { venues: Venue[]; fields: Field[]; sessions: Session[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<ToolMode>("update");
  const [updateFilters, setUpdateFilters] = useState<FilterState>(defaultFilters);
  const [duplicateFilters, setDuplicateFilters] = useState<FilterState>(defaultFilters);
  const [deleteFilters, setDeleteFilters] = useState<FilterState>(defaultFilters);
  const [newStatus, setNewStatus] = useState("");
  const [newFieldId, setNewFieldId] = useState("");
  const [shiftMinutes, setShiftMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<MessageState>(null);
  const [isPending, startTransition] = useTransition();
  const fieldsById = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
  const venuesById = useMemo(() => new Map(venues.map((venue) => [venue.id, venue])), [venues]);
  const updateMatches = useMemo(() => filterSessions(sessions, updateFilters, fieldsById), [fieldsById, sessions, updateFilters]);
  const duplicateMatches = useMemo(() => filterSessions(sessions, duplicateFilters, fieldsById), [duplicateFilters, fieldsById, sessions]);
  const deleteMatches = useMemo(() => filterSessions(sessions, deleteFilters, fieldsById), [deleteFilters, fieldsById, sessions]);
  const updateWarnings = getWarnings("update", updateMatches, { shiftMinutes });
  const duplicateWarnings = getWarnings("duplicate", duplicateMatches, { sourceDate: duplicateFilters.date, targetDate });
  const deleteWarnings = getWarnings("delete", deleteMatches);

  function runAction(action: (formData: FormData) => Promise<{ count?: number; error?: string }>, formData: FormData, successLabel: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData).catch((error: unknown) => ({
        error: error instanceof Error ? error.message : "Bulk action failed.",
      }));

      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }

      const count = "count" in result ? result.count ?? 0 : 0;
      setMessage({ kind: "success", text: `${successLabel} ${count} session${count === 1 ? "" : "s"}.` });
      setConfirmation("");
      router.refresh();
    });
  }

  function submitBulkUpdate() {
    const formData = new FormData();
    formData.set("session_ids", buildSessionIds(updateMatches));
    formData.set("status", newStatus);
    formData.set("field_id", newFieldId);
    formData.set("shift_minutes", shiftMinutes);
    formData.set("notes", notes);
    runAction(bulkUpdateSessionsAction, formData, "Updated");
  }

  function submitDuplicate() {
    const formData = new FormData();
    formData.set("session_ids", buildSessionIds(duplicateMatches));
    formData.set("target_date", targetDate);
    runAction(duplicateSessionsAction, formData, "Duplicated");
  }

  function submitDelete() {
    const formData = new FormData();
    formData.set("session_ids", buildSessionIds(deleteMatches));
    formData.set("confirmation", confirmation);
    runAction(bulkDeleteSessionsAction, formData, "Deleted");
  }

  const activeMatches = mode === "update" ? updateMatches : mode === "duplicate" ? duplicateMatches : deleteMatches;
  const activeWarnings = mode === "update" ? updateWarnings : mode === "duplicate" ? duplicateWarnings : deleteWarnings;

  return (
    <div className="mt-8 grid gap-5">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ["update", "Bulk update sessions"],
          ["duplicate", "Duplicate sessions"],
          ["delete", "Bulk delete sessions"],
        ].map(([value, label]) => (
          <button
            className={mode === value ? "min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" : "min-h-11 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black"}
            key={value}
            onClick={() => {
              setMode(value as ToolMode);
              setMessage(null);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <div className={message.kind === "success" ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-900" : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900"}>
          {message.text}
        </div>
      ) : null}

      <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
        {mode === "update" ? (
          <div className="grid gap-5">
            <div>
              <h2 className="text-xl font-black">Bulk update sessions</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Filter sessions, preview the match list, then apply one or more changes.</p>
            </div>
            <FilterControls fields={fields} filters={updateFilters} onChange={setUpdateFilters} venues={venues} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold">Change status</span>
                <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setNewStatus(event.target.value)} value={newStatus}>
                  <option value="">Keep status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="final">Final</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold">Move to field</span>
                <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setNewFieldId(event.target.value)} value={newFieldId}>
                  <option value="">Keep field</option>
                  {fields.map((field) => {
                    const venue = venuesById.get(getFieldVenueId(field.id, fieldsById));
                    return <option key={field.id} value={field.id}>{venue?.name ? `${venue.name} · ${field.name}` : field.name}</option>;
                  })}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold">Shift times</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setShiftMinutes(event.target.value)} placeholder="Minutes" type="number" value={shiftMinutes} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold">Add notes</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setNotes(event.target.value)} placeholder="Replace notes" value={notes} />
              </label>
            </div>
          </div>
        ) : null}

        {mode === "duplicate" ? (
          <div className="grid gap-5">
            <div>
              <h2 className="text-xl font-black">Duplicate sessions to another date</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Copy sessions from a source date to a target date. Scores reset and new sessions are scheduled.</p>
            </div>
            <FilterControls dateLabel="Source date" fields={fields} filters={duplicateFilters} onChange={setDuplicateFilters} venues={venues} />
            <label className="grid gap-2 sm:max-w-xs">
              <span className="text-sm font-bold">Target date</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setTargetDate(event.target.value)} type="date" value={targetDate} />
            </label>
          </div>
        ) : null}

        {mode === "delete" ? (
          <div className="grid gap-5">
            <div>
              <h2 className="text-xl font-black">Bulk delete sessions</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Filter sessions, review the preview carefully, then type DELETE to confirm.</p>
            </div>
            <FilterControls fields={fields} filters={deleteFilters} onChange={setDeleteFilters} venues={venues} />
            <label className="grid gap-2 sm:max-w-xs">
              <span className="text-sm font-bold">Confirmation text</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setConfirmation(event.target.value)} placeholder="Type DELETE" value={confirmation} />
            </label>
          </div>
        ) : null}

        <SessionPreview fieldsById={fieldsById} sessions={activeMatches} venuesById={venuesById} />

        <div className="mt-4 rounded-lg bg-white p-4">
          <h3 className="text-base font-black">Warnings</h3>
          <div className="mt-3 grid gap-2">
            {activeWarnings.map((warning) => (
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900" key={warning}>{warning}</p>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin/sessions" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 text-sm font-bold">
            Back to sessions
          </Link>
          {mode === "update" ? (
            <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending || updateMatches.length === 0} onClick={submitBulkUpdate} type="button">
              {isPending ? "Updating..." : `Update ${updateMatches.length} sessions`}
            </button>
          ) : null}
          {mode === "duplicate" ? (
            <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending || duplicateMatches.length === 0 || !targetDate} onClick={submitDuplicate} type="button">
              {isPending ? "Duplicating..." : `Duplicate ${duplicateMatches.length} sessions`}
            </button>
          ) : null}
          {mode === "delete" ? (
            <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending || deleteMatches.length === 0 || confirmation !== "DELETE"} onClick={submitDelete} type="button">
              {isPending ? "Deleting..." : `Delete ${deleteMatches.length} sessions`}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
