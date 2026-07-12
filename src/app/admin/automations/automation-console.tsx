"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Pause, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { AutomationAction, AutomationRule, AutomationTemplate } from "@/lib/automation-engine";
import type { Json } from "@/lib/supabase/types";
import type { IdentityScopeType } from "@/lib/types";

type AutomationConsoleProps = {
  defaultActorUserId: string;
  initialTemplates: AutomationTemplate[];
};

type AutomationApiListResponse = {
  ok: boolean;
  rules?: AutomationRule[];
  templates?: AutomationTemplate[];
  error?: string;
};

type AutomationLog = {
  id: string;
  logLevel: string;
  message: string;
  createdAt: string;
};

const scopeTypes: IdentityScopeType[] = ["organization", "venue", "tournament", "league"];

const emptyActionJson = JSON.stringify([
  { actionType: "create_alert", actionConfig: { title: "Operations Update", visibility: "public" }, sortOrder: 0 },
], null, 2);

function safeJsonParse(value: string): { data?: Json; error?: string } {
  try {
    return { data: JSON.parse(value) as Json };
  } catch {
    return { error: "Enter valid JSON." };
  }
}

function stringifyJson(value: Json | AutomationAction[]) {
  return JSON.stringify(value, null, 2);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not run yet";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AutomationConsole({ defaultActorUserId, initialTemplates }: AutomationConsoleProps) {
  const [actorUserId, setActorUserId] = useState(defaultActorUserId);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    actionsJson: emptyActionJson,
    conditionsJson: "{}",
    description: "",
    fieldId: "",
    name: "",
    organizationId: "",
    scopeId: "",
    scopeType: "venue" as IdentityScopeType,
    tournamentId: "",
    triggerEvent: "",
    venueId: "",
  });

  const selectedRule = useMemo(() => rules.find((rule) => rule.id === selectedRuleId) ?? null, [rules, selectedRuleId]);

  function getHeaders() {
    return {
      "content-type": "application/json",
      "x-gameday-actor-user-id": actorUserId.trim(),
    };
  }

  async function loadRules() {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/automations", { headers: getHeaders() });
      const payload = (await response.json()) as AutomationApiListResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to load automation rules.");
      setRules(payload.rules ?? []);
      setTemplates(payload.templates ?? initialTemplates);
      setMessage("Automation rules loaded.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load automation rules.");
    } finally {
      setIsLoading(false);
    }
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setForm((current) => ({
      ...current,
      actionsJson: stringifyJson(template.actions),
      conditionsJson: stringifyJson(template.conditions),
      description: template.description,
      name: template.name,
      triggerEvent: template.event.eventType,
    }));
  }

  function editRule(rule: AutomationRule) {
    setSelectedRuleId(rule.id);
    setForm({
      actionsJson: stringifyJson(rule.actions),
      conditionsJson: stringifyJson(rule.conditions ?? []),
      description: rule.description ?? "",
      name: rule.name,
      fieldId: rule.fieldId ?? "",
      organizationId: rule.organizationId ?? "",
      scopeId: rule.scopeId,
      scopeType: rule.scopeType,
      tournamentId: rule.tournamentId ?? "",
      triggerEvent: rule.eventType ?? rule.triggerEvent ?? "",
      venueId: rule.venueId ?? "",
    });
  }

  function resetForm() {
    setSelectedRuleId(null);
    setLogs([]);
    setForm({
      actionsJson: emptyActionJson,
      conditionsJson: "{}",
      description: "",
      fieldId: "",
      name: "",
      organizationId: "",
      scopeId: "",
      scopeType: "venue",
      tournamentId: "",
      triggerEvent: "",
      venueId: "",
    });
  }

  async function saveRule() {
    setError(null);
    setMessage(null);
    const conditions = safeJsonParse(form.conditionsJson);
    if (conditions.error) {
      setError(`Conditions: ${conditions.error}`);
      return;
    }
    const actions = safeJsonParse(form.actionsJson);
    if (actions.error || !Array.isArray(actions.data)) {
      setError("Actions must be valid JSON array.");
      return;
    }

    const body = {
      actions: actions.data,
      workflowType: templates.find((template) => template.name === form.name)?.workflowType ?? "schedule_changed",
      description: form.description,
      fieldId: form.fieldId || null,
      organizationId: form.organizationId || null,
      workflowStatus: selectedRule?.workflowStatus ?? "active",
      name: form.name,
      scopeId: form.scopeId,
      scopeType: form.scopeType,
      tournamentId: form.tournamentId || null,
      conditions: Array.isArray(conditions.data) ? conditions.data : [{ conditionType: "manual", conditionConfig: conditions.data ?? {}, sortOrder: 0 }],
      event: { eventType: form.triggerEvent, eventSource: "admin", eventPayload: conditions.data ?? {} },
      eventType: form.triggerEvent,
      venueId: form.venueId || null,
    };

    try {
      const response = await fetch(selectedRuleId ? `/api/admin/automations/${selectedRuleId}` : "/api/admin/automations", {
        body: JSON.stringify(body),
        headers: getHeaders(),
        method: selectedRuleId ? "PATCH" : "POST",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to save automation rule.");
      setMessage(selectedRuleId ? "Automation rule updated." : "Automation rule created.");
      resetForm();
      await loadRules();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save automation rule.");
    }
  }

  async function patchRule(rule: AutomationRule, paused: boolean) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/automations/${rule.id}`, {
        body: JSON.stringify({ paused }),
        headers: getHeaders(),
        method: "PATCH",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to update automation rule.");
      setMessage(paused ? "Rule paused." : "Rule resumed.");
      await loadRules();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Unable to update automation rule.");
    }
  }

  async function runRule(rule: AutomationRule) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/automations/${rule.id}/test`, {
        body: JSON.stringify({ triggerPayload: { source: "admin_manual_test", fieldId: rule.fieldId, venueId: rule.venueId } }),
        headers: getHeaders(),
        method: "POST",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string; run?: { runStatus: string } };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to run automation rule.");
      setMessage(`Manual test run ${payload.run?.runStatus ?? "completed"}.`);
      await loadLogs(rule.id);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run automation rule.");
    }
  }

  async function deleteRule(rule: AutomationRule) {
    if (!window.confirm(`Delete automation rule "${rule.name}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/automations/${rule.id}`, { headers: getHeaders(), method: "DELETE" });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to delete automation rule.");
      setMessage("Automation rule deleted.");
      resetForm();
      await loadRules();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete automation rule.");
    }
  }

  async function loadLogs(ruleId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/automations/${ruleId}/logs`, { headers: getHeaders() });
      const payload = (await response.json()) as { ok: boolean; error?: string; logs?: AutomationLog[] };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to load logs.");
      setLogs(payload.logs ?? []);
      setSelectedRuleId(ruleId);
    } catch (logError) {
      setError(logError instanceof Error ? logError.message : "Unable to load logs.");
    }
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section className="grid gap-4">
        <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Admin actor user id</span>
              <input
                className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold outline-none focus:border-[var(--accent)]"
                onChange={(event) => setActorUserId(event.target.value)}
                placeholder="Identity user id with automation permissions"
                value={actorUserId}
              />
            </label>
            <button className="ui-button ui-button-primary min-h-11" disabled={!actorUserId.trim() || isLoading} onClick={loadRules} type="button">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Load Rules
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
            Backend API routes require this trusted actor and verify scoped Automation permissions. This is the no-auth bridge until Supabase Auth is connected.
          </p>
          {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p> : null}
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Rules</h2>
              <p className="text-sm font-semibold text-[var(--muted)]">Scoped IF/THEN automation rules.</p>
            </div>
            <button className="ui-button ui-button-secondary min-h-11" onClick={resetForm} type="button">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Rule
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {rules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--line)] p-5 text-sm font-semibold text-[var(--muted)]">
                No automation rules loaded yet. Add an admin actor and load rules, or create the first approved rule.
              </div>
            ) : (
              rules.map((rule) => (
                <article className="rounded-lg border border-[var(--line)] p-4" key={rule.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{rule.name}</h3>
                        <span className="rounded-full bg-[var(--background)] px-2 py-1 text-xs font-black uppercase text-[var(--muted)]">{rule.workflowStatus ?? "active"}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">{rule.scopeType}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">IF {rule.eventType ?? rule.triggerEvent ?? "automation.event"} THEN {rule.actions.length} action{rule.actions.length === 1 ? "" : "s"}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Scope: {rule.scopeId}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="ui-button ui-button-secondary min-h-11" onClick={() => editRule(rule)} type="button">Edit</button>
                      <button className="ui-button ui-button-secondary min-h-11" onClick={() => patchRule(rule, (rule.workflowStatus ?? "active") === "active")} type="button">
                        {(rule.workflowStatus ?? "active") === "active" ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                        {(rule.workflowStatus ?? "active") === "active" ? "Pause" : "Resume"}
                      </button>
                      <button className="ui-button ui-button-primary min-h-11" onClick={() => runRule(rule)} type="button">
                        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                        Test Run
                      </button>
                      <button className="ui-button ui-button-secondary min-h-11" onClick={() => loadLogs(rule.id)} type="button">Logs</button>
                      <button className="ui-button ui-button-secondary min-h-11 text-red-700" onClick={() => deleteRule(rule)} type="button">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="grid gap-4 xl:sticky xl:top-32 xl:self-start">
        <section className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">{selectedRule ? "Edit rule" : "Create rule"}</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Template</span>
              <select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" defaultValue="" onChange={(event) => applyTemplate(event.target.value)}>
                <option value="">Start from template</option>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Rule name</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Description</span>
              <textarea className="min-h-24 rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold" onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Scope</span>
                <select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, scopeType: event.target.value as IdentityScopeType })} value={form.scopeType}>
                  {scopeTypes.map((scopeType) => <option key={scopeType} value={scopeType}>{scopeType}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Scope id</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, scopeId: event.target.value })} value={form.scopeId} />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Trigger event</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, triggerEvent: event.target.value })} placeholder="weather.lightning_delay_started" value={form.triggerEvent} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <input aria-label="Organization id" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, organizationId: event.target.value })} placeholder="Organization id" value={form.organizationId} />
              <input aria-label="Venue id" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, venueId: event.target.value })} placeholder="Venue id" value={form.venueId} />
              <input aria-label="Field id" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, fieldId: event.target.value })} placeholder="Field id" value={form.fieldId} />
              <input aria-label="Tournament id" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setForm({ ...form, tournamentId: event.target.value })} placeholder="Tournament id" value={form.tournamentId} />
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Conditions JSON</span>
              <textarea className="min-h-24 rounded-lg border border-[var(--line)] px-3 py-2 font-mono text-xs" onChange={(event) => setForm({ ...form, conditionsJson: event.target.value })} value={form.conditionsJson} />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Actions JSON</span>
              <textarea className="min-h-36 rounded-lg border border-[var(--line)] px-3 py-2 font-mono text-xs" onChange={(event) => setForm({ ...form, actionsJson: event.target.value })} value={form.actionsJson} />
            </label>
            <button className="ui-button ui-button-primary min-h-12" disabled={!actorUserId.trim()} onClick={saveRule} type="button">
              {selectedRule ? "Save Rule" : "Create Rule"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">Recent run logs</h2>
          <div className="mt-3 grid gap-2">
            {logs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--line)] p-4 text-sm font-semibold text-[var(--muted)]">Run a manual test or open logs for a rule.</p>
            ) : logs.map((log) => (
              <div className="rounded-lg bg-[var(--background)] p-3" key={log.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase text-[var(--muted)]">{log.logLevel}</span>
                  <span className="text-xs font-semibold text-[var(--muted)]">{formatDate(log.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm font-bold">{log.message}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
