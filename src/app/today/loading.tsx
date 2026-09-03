import { GameDayCardSkeleton, PageShell } from "@/components/ui/gameday-ui";

export default function TodayLoading() {
  return (
    <PageShell aria-busy="true" aria-label="Loading today">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-10 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-800" />
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <GameDayCardSkeleton />
        <GameDayCardSkeleton />
      </div>
    </PageShell>
  );
}
