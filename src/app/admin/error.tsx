"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="ui-card border-red-200 bg-red-50 p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-black text-red-950">This admin page could not load.</h1>
        <p className="mt-3 text-sm leading-6 text-red-800">
          Try loading the page again. The error has been logged for debugging.
        </p>
        <button className="ui-button mt-5 bg-red-700 text-white hover:bg-red-800" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
