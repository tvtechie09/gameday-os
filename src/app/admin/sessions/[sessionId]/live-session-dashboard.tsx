"use client";

import { useState } from "react";
import type { InningHalf, ResourceActivation, ResourceActivationType, Session, SessionLinkLabel, SessionStatus, VolunteerRole, VolunteerRoleType } from "@/lib/types";
import { updateSessionStateAction, type UpdateSessionStateResult } from "./actions";

type GameState = {
  home_score: number;
  away_score: number;
  inning: number;
  inning_half: InningHalf;
  balls: number;
  strikes: number;
  outs: number;
  game_status: SessionStatus;
  primary_link_label: SessionLinkLabel | "";
  primary_link_url: string;
  secondary_link_label: SessionLinkLabel | "";
  secondary_link_url: string;
  notes: string;
};

type Message = {
  kind: "success" | "error";
  text: string;
};

function stateFromSession(session: Session): GameState {
  return {
    home_score: session.homeScore,
    away_score: session.awayScore,
    inning: session.inning,
    inning_half: session.inningHalf,
    balls: session.balls,
    strikes: session.strikes,
    outs: session.outs,
    game_status: session.gameStatus,
    primary_link_label: session.primaryLinkLabel ?? "",
    primary_link_url: session.primaryLinkUrl ?? "",
    secondary_link_label: session.secondaryLinkLabel ?? "",
    secondary_link_url: session.secondaryLinkUrl ?? "",
    notes: session.notes ?? "",
  };
}

function getVolunteerRoleLabel(type: VolunteerRoleType) {
  const labels: Record<VolunteerRoleType, string> = {
    scorekeeper: "Scorekeeper",
    stream_operator: "Stream Operator",
    audio_operator: "Audio Operator",
    announcer: "Announcer",
    scoreboard_operator: "Scoreboard Operator",
    field_admin: "Field Admin",
    other: "Volunteer",
  };

  return labels[type];
}

function nextHalfInning(state: GameState): GameState {
  return {
    ...state,
    inning: state.inning_half === "bottom" ? state.inning + 1 : state.inning,
    inning_half: state.inning_half === "bottom" ? "top" : "bottom",
    balls: 0,
    strikes: 0,
    outs: 0,
  };
}

function FieldNumberInput({
  label,
  max,
  min = 0,
  name,
  onChange,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  name: keyof GameState;
  onChange: (name: keyof GameState, value: number) => void;
  value: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <input
        className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        max={max}
        min={min}
        onChange={(event) => onChange(name, Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function LinkLabelSelect({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: "primary_link_label" | "secondary_link_label";
  onChange: (name: keyof GameState, value: string) => void;
  value: SessionLinkLabel | "";
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <select
        className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
      >
        <option value="">Select label</option>
        <option value="GameChanger">GameChanger</option>
        <option value="SidelineHD">SidelineHD</option>
        <option value="YouTube">YouTube</option>
        <option value="SportsEngine">SportsEngine</option>
        <option value="TeamSnap">TeamSnap</option>
        <option value="Other">Other</option>
      </select>
    </label>
  );
}

function LinkUrlInput({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: "primary_link_url" | "secondary_link_url";
  onChange: (name: keyof GameState, value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <input
        className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        onChange={(event) => onChange(name, event.target.value)}
        placeholder="https://"
        type="url"
        value={value}
      />
    </label>
  );
}

function getActivationLabel(type: ResourceActivationType) {
  const labels: Record<ResourceActivationType, string> = {
    parent_camera: "Camera Available",
    livestream_link: "Livestream Available",
    bluetooth_speaker: "Audio Available",
    scoreboard_operator: "Scoreboard Operator Active",
    announcer: "Announcer Active",
    other: "Resource Active",
  };

  return labels[type];
}

export function LiveSessionDashboard({
  activeResources,
  session,
  volunteerRoles,
}: {
  activeResources: ResourceActivation[];
  session: Session;
  volunteerRoles: VolunteerRole[];
}) {
  const [gameState, setGameState] = useState<GameState>(() => stateFromSession(session));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function saveState(nextState: GameState, successText = "Session updated.") {
    setGameState(nextState);
    setIsSaving(true);
    setMessage(null);

    const result: UpdateSessionStateResult = await updateSessionStateAction(session.id, session.fieldId, nextState).catch((error: unknown) => {
      console.error("Failed to update session state", error);
      return {
        error: error instanceof Error ? error.message : "Unable to save session state.",
      };
    });

    if (result.error) {
      console.error("Failed to update session state", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    if (result.session) {
      setGameState(stateFromSession(result.session));
    }

    setMessage({ kind: "success", text: successText });
    setIsSaving(false);
  }

  function updateNumber(name: keyof GameState, value: number) {
    if (!Number.isFinite(value)) {
      return;
    }

    setGameState((current) => ({
      ...current,
      [name]: Math.max(value, name === "inning" ? 1 : 0),
    }));
  }

  function updateText(name: keyof GameState, value: string) {
    setGameState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function runQuickAction(action: (current: GameState) => GameState, successText: string) {
    if (isSaving) {
      return;
    }

    void saveState(action(gameState), successText);
  }

  return (
    <div className="mt-8 grid gap-5">
      {message ? (
        <div
          className={
            message.kind === "success"
              ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
              : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          }
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Live score</p>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white/65">Home</p>
            <h2 className="mt-1 truncate text-xl font-black">{session.homeTeam}</h2>
          </div>
          <div className="rounded-lg bg-white px-4 py-3 text-center text-[var(--foreground)]">
            <p className="text-4xl font-black leading-none">
              {gameState.home_score}-{gameState.away_score}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-bold text-white/65">Away</p>
            <h2 className="mt-1 truncate text-xl font-black">{session.awayTeam}</h2>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Inning</p>
            <p className="mt-1 text-lg font-black capitalize">
              {gameState.inning_half} {gameState.inning}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Count</p>
            <p className="mt-1 text-lg font-black">
              {gameState.balls}-{gameState.strikes}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Outs</p>
            <p className="mt-1 text-lg font-black">{gameState.outs}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Status</p>
            <p className="mt-1 text-lg font-black capitalize">{gameState.game_status}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">Update Score</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            className="min-h-12 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => runQuickAction((current) => ({ ...current, home_score: current.home_score + 1 }), "Home run added.")}
            type="button"
          >
            + Home Run
          </button>
          <button
            className="min-h-12 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => runQuickAction((current) => ({ ...current, away_score: current.away_score + 1 }), "Away run added.")}
            type="button"
          >
            + Away Run
          </button>
          <button
            className="min-h-12 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => runQuickAction((current) => ({ ...current, balls: Math.min(current.balls + 1, 3) }), "Ball added.")}
            type="button"
          >
            + Ball
          </button>
          <button
            className="min-h-12 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => runQuickAction((current) => ({ ...current, strikes: Math.min(current.strikes + 1, 2) }), "Strike added.")}
            type="button"
          >
            + Strike
          </button>
          <button
            className="min-h-12 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() =>
              runQuickAction((current) => (current.outs >= 2 ? nextHalfInning(current) : { ...current, outs: current.outs + 1 }), "Out recorded.")
            }
            type="button"
          >
            + Out
          </button>
          <button
            className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => runQuickAction((current) => ({ ...current, balls: 0, strikes: 0 }), "Count reset.")}
            type="button"
          >
            Reset Count
          </button>
          <button
            className="col-span-2 min-h-12 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            disabled={isSaving}
            onClick={() => runQuickAction(nextHalfInning, "Inning advanced.")}
            type="button"
          >
            Next Inning
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <h2 className="text-xl font-black">Editable game state</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FieldNumberInput label="Home score" name="home_score" onChange={updateNumber} value={gameState.home_score} />
          <FieldNumberInput label="Away score" name="away_score" onChange={updateNumber} value={gameState.away_score} />
          <FieldNumberInput label="Inning" min={1} name="inning" onChange={updateNumber} value={gameState.inning} />
          <label className="grid gap-2">
            <span className="text-sm font-bold">Inning half</span>
            <select
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base capitalize outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              onChange={(event) => setGameState((current) => ({ ...current, inning_half: event.target.value as InningHalf }))}
              value={gameState.inning_half}
            >
              <option value="top">top</option>
              <option value="bottom">bottom</option>
            </select>
          </label>
          <FieldNumberInput label="Balls" max={3} name="balls" onChange={updateNumber} value={gameState.balls} />
          <FieldNumberInput label="Strikes" max={2} name="strikes" onChange={updateNumber} value={gameState.strikes} />
          <FieldNumberInput label="Outs" max={2} name="outs" onChange={updateNumber} value={gameState.outs} />
          <label className="grid gap-2">
            <span className="text-sm font-bold">Game status</span>
            <select
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              onChange={(event) => setGameState((current) => ({ ...current, game_status: event.target.value as SessionStatus }))}
              value={gameState.game_status}
            >
              <option value="scheduled">scheduled</option>
              <option value="active">active</option>
              <option value="final">final</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">Attached resources</h2>
        {activeResources.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {activeResources.map((resource) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={resource.id}>
                <p className="text-sm font-black">✓ {getActivationLabel(resource.activationType)}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{resource.displayName}</p>
                {resource.resourceUrl ? <p className="mt-1 break-all text-sm font-bold text-[var(--accent-strong)]">{resource.resourceUrl}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active resources attached to this game.</p>
        )}
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">Volunteer roles</h2>
        {volunteerRoles.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {volunteerRoles.map((role) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={role.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black">{getVolunteerRoleLabel(role.roleType)}</p>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{role.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{role.displayName}</p>
                {role.contactName || role.contactEmail || role.contactPhone ? (
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {[role.contactName, role.contactEmail, role.contactPhone].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No approved or active volunteer roles for this session.</p>
        )}
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-black">Session links</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Add one or two parent-facing links to the platforms this game already uses.
          </p>
        </div>
        <div className="mt-5 grid gap-5">
          <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 sm:grid-cols-[180px_1fr]">
            <LinkLabelSelect label="Primary label" name="primary_link_label" onChange={updateText} value={gameState.primary_link_label} />
            <LinkUrlInput label="Primary URL" name="primary_link_url" onChange={updateText} value={gameState.primary_link_url} />
          </div>
          <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 sm:grid-cols-[180px_1fr]">
            <LinkLabelSelect label="Secondary label" name="secondary_link_label" onChange={updateText} value={gameState.secondary_link_label} />
            <LinkUrlInput label="Secondary URL" name="secondary_link_url" onChange={updateText} value={gameState.secondary_link_url} />
          </div>
        </div>
        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold">Notes</span>
          <textarea
            className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            onChange={(event) => updateText("notes", event.target.value)}
            placeholder="Parking changes, weather updates, bracket links, or venue notes."
            value={gameState.notes}
          />
        </label>
      </section>

      <div className="flex justify-end">
        <button
          className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void saveState(gameState, "Session changes saved.")}
          type="button"
        >
          {isSaving ? "Updating..." : "Update Score"}
        </button>
      </div>
    </div>
  );
}
