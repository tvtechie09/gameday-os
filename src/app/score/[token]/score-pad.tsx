"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScorekeeperSessionView, ScorekeeperState } from "@/lib/services/scorekeeper";

// Offline-first score pad. Every tap updates local state + a monotonically
// increasing seq persisted to localStorage; a sync loop pushes the absolute
// snapshot whenever the network allows. Wi-Fi blips never lose a tap.

type SyncStatus = "synced" | "syncing" | "offline";

type Stored = { pin: string; seq: number; state: ScorekeeperState };

function storageKey(token: string) {
  return "gameday-scorepad-" + token;
}

function readStored(token: string): Stored | null {
  try {
    const raw = localStorage.getItem(storageKey(token));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export function ScorePad({ token }: { token: string }) {
  const [pinInput, setPinInput] = useState("");
  const [game, setGame] = useState<ScorekeeperSessionView | null>(null);
  const [state, setState] = useState<ScorekeeperState | null>(null);
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [error, setError] = useState("");
  const seqRef = useRef(0);
  const pinRef = useRef("");
  const dirtyRef = useRef(false);

  const persist = useCallback((nextState: ScorekeeperState) => {
    try {
      localStorage.setItem(storageKey(token), JSON.stringify({ pin: pinRef.current, seq: seqRef.current, state: nextState } satisfies Stored));
    } catch { /* storage full — keep going in memory */ }
  }, [token]);

  const sync = useCallback(async (nextState: ScorekeeperState) => {
    setStatus("syncing");
    try {
      const response = await fetch("/api/score/" + encodeURIComponent(token), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pinRef.current, action: "sync", seq: seqRef.current, state: nextState })
      });
      if (!response.ok) throw new Error("sync failed");
      dirtyRef.current = false;
      setStatus("synced");
    } catch {
      dirtyRef.current = true;
      setStatus("offline");
    }
  }, [token]);

  // Background retry while offline; also resync on reconnect.
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current && state) void sync(state);
    }, 5000);
    const onOnline = () => { if (dirtyRef.current && state) void sync(state); };
    window.addEventListener("online", onOnline);
    return () => { clearInterval(timer); window.removeEventListener("online", onOnline); };
  }, [state, sync]);

  const apply = (patch: Partial<ScorekeeperState>) => {
    setState((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      seqRef.current += 1;
      persist(next);
      void sync(next);
      return next;
    });
  };

  const open = async (pin: string) => {
    try {
      const response = await fetch("/api/score/" + encodeURIComponent(token), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin })
      });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || "Wrong PIN."); return; }
      const view = payload.game as ScorekeeperSessionView;
      setError("");
      pinRef.current = pin;
      const stored = readStored(token);
      // Resume local work if this device was ahead of the server (offline finish).
      if (stored && stored.pin === pin && stored.seq > view.seq) {
        seqRef.current = stored.seq;
        setState(stored.state);
        dirtyRef.current = true;
        void sync(stored.state);
      } else {
        seqRef.current = view.seq;
        setState(view.state);
      }
      setGame(view);
      persist(stored && stored.seq > view.seq ? stored.state : view.state);
    } catch {
      setError("Could not reach GameDay OS. Check the connection and try again.");
    }
  };

  useEffect(() => {
    // Resume a saved session on this device without a synchronous setState.
    const timer = setTimeout(() => {
      const stored = readStored(token);
      if (stored?.pin) void open(stored.pin);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!game || !state) {
    return (
      <section className="mx-auto mt-10 w-full max-w-sm rounded-lg border border-[var(--line)] bg-white p-6">
        <h1 className="text-xl font-black">Scorekeeper</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Enter the 4-digit game PIN from your coach or the venue.</p>
        <input
          className="mt-4 min-h-14 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-4 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-[var(--accent)]"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setPinInput(event.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          value={pinInput}
        />
        <button className="mt-4 min-h-13 w-full rounded-lg bg-[var(--accent)] py-4 text-base font-black text-white disabled:opacity-50" disabled={pinInput.length !== 4} onClick={() => void open(pinInput)} type="button">
          Start scoring
        </button>
        {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      </section>
    );
  }

  const final = state.game_status === "final";
  const badge = status === "synced" ? { text: "Synced", cls: "bg-green-100 text-green-800" } : status === "syncing" ? { text: "Saving…", cls: "bg-sky-100 text-sky-800" } : { text: "Offline — saved on this phone, will sync", cls: "bg-amber-100 text-amber-900" };

  return (
    <section className="mx-auto w-full max-w-md px-1 pb-10">
      <header className="mt-4 rounded-lg border border-[var(--line)] bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{game.field_name}</p>
        <h1 className="mt-1 text-lg font-black leading-tight">{game.title}</h1>
        <span className={"mt-2 inline-block rounded-md px-2 py-1 text-xs font-black " + badge.cls}>{badge.text}</span>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {([["home_team", "home_score"], ["away_team", "away_score"]] as const).map(([teamKey, scoreKey]) => (
          <div key={scoreKey} className="rounded-lg border border-[var(--line)] bg-white p-4 text-center">
            <p className="truncate text-sm font-black">{game[teamKey]}</p>
            <p className="my-2 text-6xl font-black tabular-nums">{state[scoreKey]}</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="min-h-14 rounded-lg border border-[var(--line)] text-2xl font-black disabled:opacity-40" disabled={final || state[scoreKey] <= 0} onClick={() => apply({ [scoreKey]: state[scoreKey] - 1 } as Partial<ScorekeeperState>)} type="button">−</button>
              <button className="min-h-14 rounded-lg bg-[var(--accent)] text-2xl font-black text-white disabled:opacity-40" disabled={final} onClick={() => apply({ [scoreKey]: state[scoreKey] + 1 } as Partial<ScorekeeperState>)} type="button">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Inning</p>
          <p className="my-2 text-3xl font-black">{state.inning_half === "top" ? "Top" : "Bot"} {state.inning}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="min-h-12 rounded-lg border border-[var(--line)] text-sm font-black disabled:opacity-40" disabled={final} onClick={() => apply(state.inning_half === "top" ? { inning_half: "bottom" } : { inning_half: "top", inning: state.inning + 1 })} type="button">Next half</button>
            <button className="min-h-12 rounded-lg border border-[var(--line)] text-sm font-black disabled:opacity-40" disabled={final || (state.inning <= 1 && state.inning_half === "top")} onClick={() => apply(state.inning_half === "bottom" ? { inning_half: "top" } : { inning_half: "bottom", inning: Math.max(1, state.inning - 1) })} type="button">Back</button>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Outs</p>
          <p className="my-2 text-3xl font-black">{state.outs}</p>
          <button className="min-h-12 w-full rounded-lg border border-[var(--line)] text-sm font-black disabled:opacity-40" disabled={final} onClick={() => apply({ outs: state.outs >= 2 ? 0 : state.outs + 1 })} type="button">+ Out</button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {state.game_status === "scheduled" ? (
          <button className="col-span-2 min-h-14 rounded-lg bg-[var(--accent)] text-base font-black text-white" onClick={() => apply({ game_status: "active" })} type="button">Start Game</button>
        ) : final ? (
          <button className="col-span-2 min-h-14 rounded-lg border border-[var(--line)] bg-white text-base font-black" onClick={() => apply({ game_status: "active" })} type="button">Reopen Game</button>
        ) : (
          <button className="col-span-2 min-h-14 rounded-lg bg-[var(--black-soft)] text-base font-black text-white" onClick={() => apply({ game_status: "final" })} type="button">End Game (Final)</button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-[var(--muted)]">Scores appear live on the field QR page and venue TVs.</p>
    </section>
  );
}
