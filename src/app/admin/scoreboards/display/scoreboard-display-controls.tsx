"use client";

import { useMemo, useState } from "react";
import { DemoScoreboardControls } from "@/components/demo-scoreboard-controls";
import type { Field, Session, Venue } from "@/lib/types";

type ScoreboardDisplayControlsProps = {
  appUrl: string;
  fields: Field[];
  initialFieldId: string;
  initialSessionId: string;
  initialVenueId: string;
  sessions: Session[];
  venues: Venue[];
};

type Theme = "dark" | "light";

function buildUrl({
  appUrl,
  compact,
  fieldId,
  fullscreen,
  sessionId,
  showSponsor,
  theme,
}: {
  appUrl: string;
  compact: boolean;
  fieldId: string;
  fullscreen: boolean;
  sessionId: string;
  showSponsor: boolean;
  theme: Theme;
}) {
  const path = sessionId ? `/scoreboard/${sessionId}` : fieldId ? `/scoreboard/field/${fieldId}` : "";

  if (!path) {
    return "";
  }

  const params = new URLSearchParams({
    compact: String(compact),
    fullscreen: String(fullscreen),
    sponsor: String(showSponsor),
    theme,
  });

  return `${appUrl}${path}?${params.toString()}`;
}

function sessionLabel(session: Session) {
  const time = new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(session.startTime));

  return `${session.title} · ${time}`;
}

export function ScoreboardDisplayControls({
  appUrl,
  fields,
  initialFieldId,
  initialSessionId,
  initialVenueId,
  sessions,
  venues,
}: ScoreboardDisplayControlsProps) {
  const initialSession = sessions.find((session) => session.id === initialSessionId);
  const initialField = fields.find((field) => field.id === (initialSession?.fieldId ?? initialFieldId));
  const [venueId, setVenueId] = useState(initialVenueId || initialField?.venueId || "");
  const [fieldId, setFieldId] = useState(initialSession?.fieldId ?? initialFieldId);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [theme, setTheme] = useState<Theme>("dark");
  const [compact, setCompact] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSponsor, setShowSponsor] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");

  const venueFields = useMemo(() => fields.filter((field) => !venueId || field.venueId === venueId), [fields, venueId]);
  const fieldSessions = useMemo(() => sessions.filter((session) => !fieldId || session.fieldId === fieldId), [sessions, fieldId]);
  const selectedField = fields.find((field) => field.id === fieldId);
  const selectedSession = sessions.find((session) => session.id === sessionId);
  const displayUrl = buildUrl({ appUrl, compact, fieldId, fullscreen, sessionId, showSponsor, theme });
  const obsUrl = buildUrl({ appUrl, compact: true, fieldId, fullscreen: true, sessionId, showSponsor, theme: "dark" });
  const previewUrl = displayUrl || obsUrl;

  function handleVenueChange(nextVenueId: string) {
    setVenueId(nextVenueId);
    setSessionId("");

    const nextField = fields.find((field) => field.venueId === nextVenueId);
    setFieldId(nextField?.id ?? "");
  }

  function handleFieldChange(nextFieldId: string) {
    setFieldId(nextFieldId);
    setSessionId("");

    const nextField = fields.find((field) => field.id === nextFieldId);
    if (nextField) {
      setVenueId(nextField.venueId);
    }
  }

  function handleSessionChange(nextSessionId: string) {
    setSessionId(nextSessionId);

    const nextSession = sessions.find((session) => session.id === nextSessionId);
    const nextField = nextSession ? fields.find((field) => field.id === nextSession.fieldId) : null;

    if (nextField) {
      setFieldId(nextField.id);
      setVenueId(nextField.venueId);
    }
  }

  async function copyUrl(url: string) {
    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Copied.");
    } catch (error) {
      console.error("Failed to copy scoreboard URL", error);
      setCopyMessage("Copy failed.");
    }
  }

  function openUrl(url: string, fullscreen = false) {
    if (!url) {
      return;
    }

    const targetUrl = fullscreen ? setUrlParam(url, "fullscreen", "true") : url;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-8 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="grid gap-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-xl font-black">Display setup</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Choose a session for a fixed game scoreboard, or leave session blank to use the active/next session for a field.</p>
        </div>

        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Venue</span>
            <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => handleVenueChange(event.target.value)} value={venueId}>
              <option value="">All venues</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Field</span>
            <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => handleFieldChange(event.target.value)} value={fieldId}>
              <option value="">Select field</option>
              {venueFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Session</span>
            <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => handleSessionChange(event.target.value)} value={sessionId}>
              <option value="">Use field active/next session</option>
              {fieldSessions.map((session) => <option key={session.id} value={session.id}>{sessionLabel(session)}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
          <h3 className="text-base font-black">Display options</h3>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Theme</span>
            <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setTheme(event.target.value === "light" ? "light" : "dark")} value={theme}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-lg bg-white px-3">
            <input checked={compact} className="h-5 w-5" onChange={(event) => setCompact(event.target.checked)} type="checkbox" />
            <span className="text-sm font-bold">Compact mode</span>
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-lg bg-white px-3">
            <input checked={showSponsor} className="h-5 w-5" onChange={(event) => setShowSponsor(event.target.checked)} type="checkbox" />
            <span className="text-sm font-bold">Show sponsor</span>
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-lg bg-white px-3">
            <input checked={fullscreen} className="h-5 w-5" onChange={(event) => setFullscreen(event.target.checked)} type="checkbox" />
            <span className="text-sm font-bold">Full screen mode</span>
          </label>
        </div>

        <div className="grid gap-3">
          <UrlPanel label="Public scoreboard URL" url={displayUrl} />
          <UrlPanel label="OBS browser source URL" url={obsUrl} />
          {copyMessage ? <p className="text-sm font-bold text-[var(--accent-strong)]">{copyMessage}</p> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold disabled:opacity-50" disabled={!displayUrl} onClick={() => copyUrl(displayUrl)} type="button">
            Copy URL
          </button>
          <button className="min-h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:opacity-50" disabled={!displayUrl} onClick={() => openUrl(displayUrl)} type="button">
            Open Display
          </button>
          <button className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold disabled:opacity-50" disabled={!displayUrl} onClick={() => openUrl(displayUrl, true)} type="button">
            Open Fullscreen
          </button>
          <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white disabled:opacity-50" disabled={!obsUrl} onClick={() => openUrl(obsUrl)} type="button">
            Open OBS Mode
          </button>
        </div>
      </section>

      <section className="grid gap-5">
        <DemoScoreboardControls key={selectedSession?.id ?? "no-session"} session={selectedSession ?? null} />

        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Live preview</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {selectedSession ? selectedSession.title : selectedField ? `${selectedField.name} active/next display` : "Select a field or session to preview."}
            </p>
          </div>
          <span className="w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            {theme} {compact ? "compact" : "standard"}
          </span>
        </div>
        <div className="mt-5 overflow-hidden rounded-lg border border-[var(--line)] bg-black">
          {previewUrl ? (
            <iframe className="h-[520px] w-full border-0" src={previewUrl} title="Scoreboard display preview" />
          ) : (
            <div className="grid h-[520px] place-items-center p-8 text-center text-white">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/60">Preview standby</p>
                <p className="mt-3 text-3xl font-black">Choose a field or session</p>
              </div>
            </div>
          )}
        </div>
      </section>
      </section>
    </div>
  );
}

function UrlPanel({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 break-all text-sm font-bold">{url || "Select a field or session to generate a URL."}</p>
    </div>
  );
}

function setUrlParam(url: string, key: string, value: string) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set(key, value);
  return nextUrl.toString();
}
