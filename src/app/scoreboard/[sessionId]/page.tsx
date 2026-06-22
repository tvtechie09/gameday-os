import { getScoreboardPayloadBySessionId } from "@/lib/services/scoreboard-display";
import { ScoreboardDisplay } from "../scoreboard-display";

type SessionScoreboardPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams?: Promise<{
    compact?: string;
    fullscreen?: string;
    sponsor?: string;
    theme?: string;
  }>;
};

export const dynamic = "force-dynamic";

function readTheme(value: string | undefined) {
  return value === "light" ? "light" : "dark";
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export default async function SessionScoreboardPage({ params, searchParams }: SessionScoreboardPageProps) {
  const { sessionId } = await params;
  const options = await searchParams;
  const payload = await getScoreboardPayloadBySessionId(sessionId);

  return (
    <ScoreboardDisplay
      apiPath={`/api/scoreboard/session/${sessionId}`}
      compact={readBoolean(options?.compact, false)}
      fullscreen={readBoolean(options?.fullscreen, false)}
      initialPayload={payload}
      showSponsor={readBoolean(options?.sponsor, true)}
      theme={readTheme(options?.theme)}
    />
  );
}
