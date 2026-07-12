"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Pause, Play, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import type { AutomationRule, AutomationTemplate } from "@/lib/automation-engine";
import type { IdentityScopeType } from "@/lib/types";

type MarketplaceProps = {
  defaultActorUserId: string;
  initialTemplates: AutomationTemplate[];
};

type MarketplaceResponse = {
  ok: boolean;
  templates?: AutomationTemplate[];
  workflows?: AutomationRule[];
  error?: string;
};

type InstallForm = {
  activate: boolean;
  fieldIds: string;
  fieldId: string;
  notificationAudience: string;
  organizationId: string;
  scopeId: string;
  scopeType: Extract<IdentityScopeType, "organization" | "venue" | "field" | "tournament">;
  tournamentId: string;
  venueId: string;
};

const audienceOptions = [
  { label: "Venue admins", value: "venue_admins" },
  { label: "Venue staff", value: "venue_staff" },
  { label: "Tournament staff", value: "tournament_staff" },
  { label: "Teams", value: "teams" },
  { label: "Public pages", value: "public_pages" },
];

const initialForm: InstallForm = {
  activate: true,
  fieldId: "",
  fieldIds: "",
  notificationAudience: "venue_admins",
  organizationId: "",
  scopeId: "",
  scopeType: "venue",
  tournamentId: "",
  venueId: "",
};

function getWorkflowStatusLabel(workflow: AutomationRule) {
  return workflow.workflowStatus ?? workflow.ruleStatus ?? "active";
}

export function AutomationTemplateMarketplace({ defaultActorUserId, initialTemplates }: MarketplaceProps) {
  const [actorUserId, setActorUserId] = useState(defaultActorUserId);
  const [templates, setTemplates] = useState(initialTemplates);
  const [workflows, setWorkflows] = useState<AutomationRule[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState<InstallForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? null, [selectedTemplateId, templates]);
  const installedByTemplate = useMemo(() => {
    const map = new Map<string, AutomationRule[]>();
    for (const workflow of workflows) {
      if (!workflow.templateKey) continue;
      const current = map.get(workflow.templateKey) ?? [];
      current.push(workflow);
      map.set(workflow.templateKey, current);
    }
    return map;
  }, [workflows]);

  function getHeaders() {
    return { "content-type": "application/json", "x-gameday-actor-user-id": actorUserId.trim() };
  }

  async function loadMarketplace() {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/automations/templates", { headers: getHeaders() });
      const payload = (await response.json()) as MarketplaceResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to load automation templates.");
      setTemplates(payload.templates ?? initialTemplates);
      setWorkflows(payload.workflows ?? []);
      setMessage("Marketplace loaded.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load automation templates.");
    } finally {
      setIsLoading(false);
    }
  }

  function selectTemplate(template: AutomationTemplate) {
    setSelectedTemplateId(template.id);
    setForm((current) => ({ ...current, notificationAudience: template.defaultNotificationAudience || "venue_admins" }));
    setMessage(null);
    setError(null);
  }

  async function installTemplate() {
    if (!selectedTemplate) return;
    if (!form.scopeId.trim()) {
      setError("Choose a scope and enter the matching scope ID before installing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const fieldIds = form.fieldIds.split(",").map((value) => value.trim()).filter(Boolean);
      const response = await fetch(`/api/admin/automations/templates/${selectedTemplate.id}/install`, {
        body: JSON.stringify({
          activate: form.activate,
          fieldId: form.fieldId || null,
          fieldIds,
          notificationAudience: form.notificationAudience,
          organizationId: form.organizationId || null,
          scopeId: form.scopeId,
          scopeType: form.scopeType,
          tournamentId: form.tournamentId || null,
          venueId: form.venueId || null,
        }),
        headers: getHeaders(),
        method: "POST",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string; workflow?: AutomationRule };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to install automation template.");
      setMessage(`${selectedTemplate.name} installed${form.activate ? " and activated" : " as paused"}.`);
      setSelectedTemplateId(null);
      setForm(initialForm);
      await loadMarketplace();
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : "Unable to install automation template.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateWorkflow(workflow: AutomationRule, action: "pause" | "enable" | "test" | "remove") {
    setError(null);
    setMessage(null);
    try {
      const method = action === "remove" ? "DELETE" : action === "test" ? "POST" : "PATCH";
      const path = action === "test" ? `/api/admin/automations/${workflow.id}/test` : `/api/admin/automations/${workflow.id}`;
      const response = await fetch(path, { body: action === "test" ? JSON.stringify({ triggerPayload: { source: "marketplace_manual_test", fieldId: workflow.fieldId, venueId: workflow.venueId } }) : action === "pause" || action === "enable" ? JSON.stringify({ paused: action === "pause" }) : undefined, headers: getHeaders(), method });
      const payload = (await response.json()) as { ok: boolean; error?: string; run?: { runStatus: string } };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to update workflow.");
      setMessage(action === "test" ? `Manual test run ${payload.run?.runStatus ?? "completed"}.` : `Workflow ${action === "remove" ? "removed" : action === "pause" ? "paused" : "activated"}.`);
      await loadMarketplace();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update workflow.");
    }
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <section className="grid gap-4">
        <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Admin actor user id</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold outline-none focus:border-[var(--accent)]" onChange={(event) => setActorUserId(event.target.value)} placeholder="Identity user id with automation permissions" value={actorUserId} />
            </label>
            <button className="ui-button ui-button-primary min-h-11" disabled={!actorUserId.trim() || isLoading} onClick={loadMarketplace} type="button">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Load Marketplace
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Only admin roles with scoped automation permissions can install or manage templates.</p>
          {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {templates.map((template) => {
            const installed = installedByTemplate.get(template.id) ?? [];
            return (
              <article className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm" key={template.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{template.workflowType.replaceAll("_", " ")}</p>
                    <h2 className="mt-1 text-xl font-black">{template.name}</h2>
                  </div>
                  {installed.length ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Installed</span> : <span className="rounded-full bg-[var(--background)] px-2 py-1 text-xs font-black text-[var(--muted)]">Not installed</span>}
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">{template.description}</p>
                <div className="mt-4 rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Required setup</p>
                  <ul className="mt-2 grid gap-1 text-sm font-semibold text-[var(--text)]">
                    {template.requiredConfiguration.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                {installed.length ? (
                  <div className="mt-4 grid gap-2">
                    {installed.map((workflow) => (
                      <div className="rounded-lg border border-[var(--line)] p-3" key={workflow.id}>
                        <p className="text-sm font-black">{workflow.name}</p>
                        <p className="text-xs font-semibold text-[var(--muted)]">{workflow.scopeType}: {workflow.scopeId} · {getWorkflowStatusLabel(workflow)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className="ui-button ui-button-secondary min-h-11" onClick={() => updateWorkflow(workflow, getWorkflowStatusLabel(workflow) === "active" ? "pause" : "enable")} type="button">
                            {getWorkflowStatusLabel(workflow) === "active" ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                            {getWorkflowStatusLabel(workflow) === "active" ? "Pause" : "Activate"}
                          </button>
                          <button className="ui-button ui-button-secondary min-h-11" onClick={() => updateWorkflow(workflow, "test")} type="button"><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Test</button>
                          <button className="ui-button ui-button-secondary min-h-11 text-red-700" onClick={() => updateWorkflow(workflow, "remove")} type="button"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <button className="ui-button ui-button-primary mt-4 min-h-11 w-full" onClick={() => selectTemplate(template)} type="button">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Install Template
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="grid gap-4 xl:sticky xl:top-32 xl:self-start">
        <section className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">Install flow</h2>
          {selectedTemplate ? (
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Installing {selectedTemplate.name}</div>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Scope</span>
                <select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, scopeType: event.target.value as InstallForm["scopeType"] })} value={form.scopeType}>
                  <option value="venue">Venue</option>
                  <option value="field">Fields</option>
                  <option value="tournament">Tournament</option>
                  <option value="organization">Organization</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Scope ID</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, scopeId: event.target.value })} placeholder="UUID for selected scope" value={form.scopeId} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Venue ID</span>
                  <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, venueId: event.target.value })} value={form.venueId} />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Organization ID</span>
                  <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, organizationId: event.target.value })} value={form.organizationId} />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Field IDs</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, fieldIds: event.target.value, fieldId: event.target.value.split(",")[0]?.trim() ?? "" })} placeholder="Comma separated field UUIDs" value={form.fieldIds} />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Tournament ID</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, tournamentId: event.target.value })} value={form.tournamentId} />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Notification audience</span>
                <select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, notificationAudience: event.target.value })} value={form.notificationAudience}>
                  {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--line)] px-3 text-sm font-bold">
                <input checked={form.activate} onChange={(event) => setForm({ ...form, activate: event.target.checked })} type="checkbox" />
                Activate immediately
              </label>
              <div className="rounded-lg bg-[var(--background)] p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Review actions</p>
                <ul className="mt-2 grid gap-1 text-sm font-semibold text-[var(--text)]">
                  {selectedTemplate.actions.map((action) => <li key={`${action.sortOrder}-${action.actionType}`}>THEN {action.actionType.replaceAll("_", " ")}</li>)}
                </ul>
              </div>
              <button className="ui-button ui-button-primary min-h-11" disabled={isLoading || !actorUserId.trim()} onClick={installTemplate} type="button">Activate Template</button>
              <button className="ui-button ui-button-secondary min-h-11" onClick={() => setSelectedTemplateId(null)} type="button">Cancel</button>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">Choose an approved internal template to review its required configuration, actions, and activation settings.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
