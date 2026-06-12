"use client";

export function PrintDownloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white print:hidden"
    >
      Download / Print
    </button>
  );
}
