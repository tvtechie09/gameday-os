"use client";

import { useEffect } from "react";

export default function PublicFieldError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public field page error", error);
  }, [error]);

  return (
    <section className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Field page unavailable</p>
        <h1 className="mt-2 text-2xl font-black text-red-950">We could not load this field page.</h1>
        <p className="mt-3 text-sm leading-6 text-red-800">
          Try again, or ask the venue for an updated QR link.
        </p>
        <button className="ui-button mt-5 bg-red-700 text-white hover:bg-red-800" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
