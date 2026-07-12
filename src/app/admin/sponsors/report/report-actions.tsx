"use client";

export function ReportActions({ csv, fileName }: { csv: string; fileName: string }) {
  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
        Print / Save PDF
      </button>
      <button type="button" onClick={download} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
        Download CSV
      </button>
    </div>
  );
}
