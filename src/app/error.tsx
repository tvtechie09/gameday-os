"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("GameDay Venue route failed", error); }, [error]);
  return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-bold">We could not load this Venue screen</h1><p className="mt-3">No operational change was submitted. Check your connection and try again.</p><button className="mt-5 rounded bg-slate-900 px-4 py-2 text-white" onClick={reset}>Try again</button></main>;
}
