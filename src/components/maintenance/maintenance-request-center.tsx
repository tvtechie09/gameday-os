"use client";

import { useMemo, useState } from "react";
import type { MaintenanceLocationType, MaintenancePriority, MaintenanceRequest, MaintenanceStatus } from "@/lib/maintenance";
import { createMaintenanceRequest, maintenanceCategories, maintenanceLocationTypes, maintenancePriorities, maintenanceStatuses, updateMaintenanceStatus } from "@/lib/maintenance";

interface MaintenanceRequestCenterProps {
  initialLocationId?: string;
  initialLocationType?: MaintenanceLocationType;
  locationLabels?: Record<string, string>;
  mode?: "full" | "create";
  requests: MaintenanceRequest[];
  title?: string;
  venueId: string;
}

interface MaintenanceDraftState {
  assignedTo: string;
  category: MaintenanceRequest["category"];
  description: string;
  locationId: string;
  locationType: MaintenanceLocationType;
  priority: MaintenancePriority;
  reportedByRole: string;
  title: string;
}

const statusLabels: Record<MaintenanceStatus, string> = {
  assigned: "Assigned",
  closed: "Closed",
  in_progress: "In Progress",
  new: "New",
  resolved: "Resolved",
};

export function MaintenanceRequestCenter({
  initialLocationId,
  initialLocationType = "venue",
  locationLabels,
  mode = "full",
  requests,
  title = "Maintenance Requests",
  venueId,
}: MaintenanceRequestCenterProps) {
  const [items, setItems] = useState(requests);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState<MaintenanceLocationType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | "all">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<MaintenanceDraftState>({
    assignedTo: "",
    category: "general",
    description: "",
    locationId: initialLocationId ?? venueId,
    locationType: initialLocationType,
    priority: "medium",
    reportedByRole: "venue staff",
    title: "",
  });

  const visibleItems = useMemo(() => items.filter((item) => {
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    const locationMatch = locationFilter === "all" || item.locationType === locationFilter;
    const priorityMatch = priorityFilter === "all" || item.priority === priorityFilter;

    return statusMatch && locationMatch && priorityMatch;
  }), [items, locationFilter, priorityFilter, statusFilter]);

  function handleCreate() {
    if (!draft.title.trim() || !draft.description.trim() || !draft.locationId.trim()) {
      setMessage("Add a title, description, and location before creating the request.");
      return;
    }

    const request = createMaintenanceRequest({
      assignedTo: draft.assignedTo.trim() || undefined,
      category: draft.category,
      description: draft.description,
      locationId: draft.locationId,
      locationType: draft.locationType,
      priority: draft.priority,
      reportedByRole: draft.reportedByRole,
      title: draft.title,
      venueId,
    });

    setItems((current) => [request, ...current]);
    setMessage("Maintenance request created locally for demo review. No external ticketing system is connected.");
    setDraft((current) => ({ ...current, assignedTo: "", description: "", title: "" }));
  }

  function handleStatusChange(requestId: string, status: MaintenanceStatus) {
    setItems((current) => current.map((item) => item.id === requestId ? updateMaintenanceStatus(item, status) : item));
    setMessage("Request status updated in the local operations view.");
  }

  function getLocationLabel(locationId: string) {
    return locationLabels?.[locationId] ?? locationId;
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">GameDay Venue Maintenance</p>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
              Lightweight venue request tracking for fields, POIs, restrooms, concessions, parking, and equipment endpoints.
            </p>
          </div>
          <span className="rounded-md bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-amber-950 ring-1 ring-amber-200">
            External CMMS: future integration
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h3 className="text-xl font-black">Create request</h3>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-black">Title</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Brief issue title" value={draft.title} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black">Description</span>
              <textarea className="min-h-24 rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold" onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What needs attention?" value={draft.description} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Location Type" onChange={(value) => setDraft((current) => ({ ...current, locationType: value as MaintenanceLocationType }))} options={maintenanceLocationTypes} value={draft.locationType} />
              <label className="grid gap-2">
                <span className="text-sm font-black">Location ID</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold" onChange={(event) => setDraft((current) => ({ ...current, locationId: event.target.value }))} value={draft.locationId} />
              </label>
              <Select label="Category" onChange={(value) => setDraft((current) => ({ ...current, category: value as MaintenanceRequest["category"] }))} options={maintenanceCategories} value={draft.category} />
              <Select label="Priority" onChange={(value) => setDraft((current) => ({ ...current, priority: value as MaintenancePriority }))} options={maintenancePriorities} value={draft.priority} />
              <label className="grid gap-2">
                <span className="text-sm font-black">Reported By Role</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold" onChange={(event) => setDraft((current) => ({ ...current, reportedByRole: event.target.value }))} value={draft.reportedByRole} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black">Assigned To</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold" onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))} placeholder="Optional" value={draft.assignedTo} />
              </label>
            </div>
            <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" onClick={handleCreate} type="button">
              Create Maintenance Request
            </button>
            {message ? <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold text-[var(--muted)]">{message}</p> : null}
          </div>
        </div>

        {mode === "full" ? (
          <div className="grid gap-4">
            <div className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h3 className="text-xl font-black">Request list</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Filter label="Status" onChange={(value) => setStatusFilter(value as MaintenanceStatus | "all")} options={["all", ...maintenanceStatuses]} value={statusFilter} />
                <Filter label="Location" onChange={(value) => setLocationFilter(value as MaintenanceLocationType | "all")} options={["all", ...maintenanceLocationTypes]} value={locationFilter} />
                <Filter label="Priority" onChange={(value) => setPriorityFilter(value as MaintenancePriority | "all")} options={["all", ...maintenancePriorities]} value={priorityFilter} />
              </div>
            </div>
            <div className="grid gap-3">
              {visibleItems.length > 0 ? visibleItems.map((request) => (
                <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={request.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge value={request.priority} variant="priority" />
                        <Badge value={statusLabels[request.status]} variant="status" />
                      </div>
                      <h4 className="mt-3 text-lg font-black">{request.title}</h4>
                      <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{request.description}</p>
                      <p className="mt-3 text-sm font-black">{getLocationLabel(request.locationId)}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{request.locationType} · {request.category} · reported by {request.reportedByRole}</p>
                      {request.externalTicketId ? (
                        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-950">External ticket field is demo data only. Future integration is not live.</p>
                      ) : null}
                    </div>
                    <label className="grid min-w-[180px] gap-2">
                      <span className="text-sm font-black">Update status</span>
                      <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" onChange={(event) => handleStatusChange(request.id, event.target.value as MaintenanceStatus)} value={request.status}>
                        {maintenanceStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                      </select>
                    </label>
                  </div>
                </article>
              )) : (
                <div className="rounded-lg border border-dashed border-[var(--line)] bg-white p-6 text-sm font-bold text-[var(--muted)]">No maintenance requests match these filters.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Filter({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return <Select label={label} onChange={onChange} options={options} value={value} />;
}

function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-black">{label}</span>
      <select className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
      </select>
    </label>
  );
}

function Badge({ value, variant }: { value: string; variant: "priority" | "status" }) {
  const urgent = value === "urgent" || value === "high";
  const classes = urgent
    ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200"
    : variant === "status"
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
      : "bg-slate-100 text-slate-900 ring-1 ring-slate-200";

  return <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${classes}`}>{value}</span>;
}
