"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error", error.digest ?? "no-digest");
  }, [error.digest]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="ui-card border-red-200 bg-red-50 p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-black text-red-950">This admin page could not load.</h1>
        <p className="mt-3 text-sm leading-6 text-red-800">
          Try loading the page again. If the problem continues, return to Venue Status and confirm the venue&apos;s data has finished loading.
        </p>
        {error.digest ? <p className="mt-3 text-xs font-bold text-red-800">Reference: {error.digest}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="ui-button bg-red-700 text-white hover:bg-red-800" onClick={reset} type="button">
            Try again
          </button>
          <Link className="ui-button border border-red-200 bg-white text-red-800 hover:bg-red-100" href="/admin/operations-center">
            Venue Status
          </Link>
          <Link className="ui-button border border-red-200 bg-white text-red-800 hover:bg-red-100" href="/admin">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
