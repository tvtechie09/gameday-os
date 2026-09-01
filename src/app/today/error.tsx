"use client";

import { ErrorState, PageShell, buttonStyles } from "@/components/ui/gameday-ui";

export default function TodayError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageShell size="compact">
      <ErrorState message="The live schedule could not be loaded. Your data was not changed." title="Today is temporarily unavailable" />
      <button className={buttonStyles("primary", "mt-4")} onClick={reset} type="button">Try again</button>
    </PageShell>
  );
}
