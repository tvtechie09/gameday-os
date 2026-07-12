"use client";

import { useState } from "react";
import { Cable, PowerOff, RefreshCw, ScrollText } from "lucide-react";
import type { Venue } from "@/lib/types";

type ProviderSummary = {
  provider: {
    key: string;
    name: string;
    category: string;
    authType: string;
    description: string;
    credentialRequirements: Array<{ envVar: string; label: string; required: boolean; secret: boolean }>;
    supportsManualSync: boolean;
    supportsOAuth: boolean;
    supportsWebhooks: boolean;
    existingImplementation?: { routes: string[]; services: string[]; envVars: string[]; databaseTables: string[] };
  };
  status: string;
  missingEnvVars: string[];
  configuredEnvVars: string[];
  message: string;
  connection: null | {
    id: string;
    connectionStatus: string;
    authStatus: string;
    lastSyncAt: string | null;
    errorMessage: string | null;
    venueId: string | null;
  };
};

type IntegrationLog = {
  id: string;
  logLevel: string;
  message: string;
  createdAt: string;
};

type Props = {
  defaultActorUserId: string;
  venues: Venue[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "connected") return "bg-emerald-100 text-emerald-900";
  if (status === "ready_to_connect") return "bg-blue-100 text-blue-900";
  if (status === "credentials_missing" || status === "sync_error") return "bg-amber-100 text-amber-900";
  if (status === "disconnected") return "bg-slate-200 text-slate-800";
  return "bg-[var(--background)] text-[var(--muted)]";
}

export function IntegrationFrameworkConsole({ defaultActorUserId, venues }: Props) {
  const [actorUserId, setActorUserId] = useState(defaultActorUserId);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id ?? "");
  const [externalAccountName, setExternalAccountName] = useState("");
  const [externalOrgId, setExternalOrgId] = useState("");
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId) ?? null;

  function headers() {
    return { "content-type": "application/json", "x-gameday-actor-user-id": actorUserId.trim() };
  }

  async function loadProviders() {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/integrations", { headers: headers() });
      const payload = await response.json() as { ok: boolean; providers?: ProviderSummary[]; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to load integrations.");
      setProviders(payload.providers ?? []);
      setMessage("Integration providers loaded.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load integrations.");
    }
  }

  async function connect(providerKey: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/integrations/${providerKey}/connect`, {
        body: JSON.stringify({ externalAccountName, externalOrgId, organizationId: selectedVenue?.organizationId ?? null, venueId: selectedVenueId }),
        headers: headers(),
        method: "POST",
      });
      const payload = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to connect provider.");
      setMessage("Connection record updated.");
      await loadProviders();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Unable to connect provider.");
    }
  }

  async function disconnect(providerKey: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/integrations/${providerKey}/disconnect`, { headers: headers(), method: "POST" });
      const payload = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to disconnect provider.");
      setMessage("Provider disconnected.");
      await loadProviders();
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Unable to disconnect provider.");
    }
  }

  async function sync(providerKey: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/integrations/${providerKey}/sync`, {
        body: JSON.stringify({ idempotencyKey: `${providerKey}:${new Date().toISOString().slice(0, 16)}` }),
        headers: headers(),
        method: "POST",
      });
      const payload = await response.json() as { ok: boolean; run?: { run_status?: string; runStatus?: string; error_message?: string; errorMessage?: string }; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to sync provider.");
      setMessage(`Sync recorded: ${payload.run?.runStatus ?? payload.run?.run_status ?? "failed"}. ${payload.run?.errorMessage ?? payload.run?.error_message ?? ""}`);
      await loadLogs(providerKey);
      await loadProviders();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to sync provider.");
    }
  }

  async function loadLogs(providerKey: string) {
    setSelectedProvider(providerKey);
    setError(null);
    try {
      const response = await fetch(`/api/admin/integrations/${providerKey}/logs`, { headers: headers() });
      const payload = await response.json() as { ok: boolean; logs?: IntegrationLog[]; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to load logs.");
      setLogs(payload.logs ?? []);
    } catch (logsError) {
      setError(logsError instanceof Error ? logsError.message : "Unable to load logs.");
    }
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="grid gap-5">
        <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Admin actor user id</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setActorUserId(event.target.value)} placeholder="Identity user id with integrations permissions" value={actorUserId} />
            </label>
            <button className="ui-button ui-button-primary min-h-11" disabled={!actorUserId.trim()} onClick={loadProviders} type="button"><RefreshCw className="h-4 w-4" />Load Providers</button>
          </div>
          {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p> : null}
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">Connection scope</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setSelectedVenueId(event.target.value)} value={selectedVenueId}>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select>
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setExternalAccountName(event.target.value)} placeholder="External account name" value={externalAccountName} />
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" onChange={(event) => setExternalOrgId(event.target.value)} placeholder="External org/account id" value={externalOrgId} />
          </div>
        </div>

        <div className="grid gap-4">
          {providers.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--line)] bg-white p-5 text-sm font-semibold text-[var(--muted)]">Load providers to view integration status.</p> : providers.map((summary) => (
            <article className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm" key={summary.provider.key}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--black-soft)] px-2 py-1 text-xs font-black text-white">{summary.provider.category}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${statusClass(summary.connection?.connectionStatus ?? summary.status)}`}>{summary.connection?.connectionStatus ?? summary.status}</span>
                    <span className="rounded-full bg-[var(--background)] px-2 py-1 text-xs font-black uppercase text-[var(--muted)]">{summary.provider.authType}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-black">{summary.provider.name}</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">{summary.provider.description}</p>
                  <p className="mt-2 text-sm font-bold">{summary.message}</p>
                  {summary.provider.existingImplementation ? <p className="mt-2 text-xs font-bold text-[var(--accent-strong)]">Existing implementation registered: {summary.provider.existingImplementation.routes.join(", ")}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button className="ui-button ui-button-primary min-h-11" disabled={!actorUserId.trim()} onClick={() => connect(summary.provider.key)} type="button"><Cable className="h-4 w-4" />Connect</button>
                  <button className="ui-button ui-button-secondary min-h-11" disabled={!summary.connection} onClick={() => disconnect(summary.provider.key)} type="button"><PowerOff className="h-4 w-4" />Disconnect</button>
                  <button className="ui-button ui-button-secondary min-h-11" disabled={!summary.connection || !summary.provider.supportsManualSync} onClick={() => sync(summary.provider.key)} type="button"><RefreshCw className="h-4 w-4" />Sync Now</button>
                  <button className="ui-button ui-button-secondary min-h-11" disabled={!summary.connection} onClick={() => loadLogs(summary.provider.key)} type="button"><ScrollText className="h-4 w-4" />Logs</button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {summary.provider.credentialRequirements.length === 0 ? <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold text-[var(--muted)]">No credential requirements registered yet.</p> : summary.provider.credentialRequirements.map((credential) => (
                  <div className="rounded-lg bg-[var(--background)] p-3" key={credential.envVar}>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{credential.required ? "Required" : "Optional"}</p>
                    <p className="mt-1 text-sm font-black">{credential.label}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{credential.secret ? "Secret masked" : credential.envVar}</p>
                    <p className="mt-2 text-xs font-black text-[var(--accent-strong)]">{summary.configuredEnvVars.includes(credential.envVar) ? "Configured" : "Missing"}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm xl:sticky xl:top-32 xl:self-start">
        <h2 className="text-xl font-black">Logs {selectedProvider ? `· ${selectedProvider}` : ""}</h2>
        <div className="mt-3 grid gap-2">
          {logs.length === 0 ? <p className="rounded-lg border border-dashed border-[var(--line)] p-4 text-sm font-semibold text-[var(--muted)]">Open logs for a connected provider.</p> : logs.map((log) => (
            <div className="rounded-lg bg-[var(--background)] p-3" key={log.id}>
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase text-[var(--muted)]">{log.logLevel}</span><span className="text-xs font-semibold text-[var(--muted)]">{formatDate(log.createdAt)}</span></div>
              <p className="mt-1 text-sm font-bold">{log.message}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
