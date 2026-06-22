"use client";

import { useState } from "react";
import { runScoreboardAdapterTestAction } from "./actions";

export function AdapterTestButton({ adapterId }: { adapterId: string }) {
  const [message, setMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  async function runTest() {
    if (isTesting) {
      return;
    }

    setIsTesting(true);
    setMessage("");

    const result = await runScoreboardAdapterTestAction(adapterId).catch((error: unknown) => {
      console.error("Failed to run adapter test", error);
      return {
        error: error instanceof Error ? error.message : "Unable to run adapter test mode.",
      };
    });

    setMessage(result.error ? result.error : "Test mode completed.");
    setIsTesting(false);
  }

  return (
    <div className="grid gap-2">
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isTesting}
        onClick={runTest}
        type="button"
      >
        {isTesting ? "Testing..." : "Run Test Mode"}
      </button>
      {message ? <p className="text-xs font-bold text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
