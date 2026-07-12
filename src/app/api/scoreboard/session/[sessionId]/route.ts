import { NextResponse } from "next/server";
import { getScoreboardPayloadBySessionId } from "@/lib/services/scoreboard-display";

type SessionScoreboardApiProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, { params }: SessionScoreboardApiProps) {
  try {
    const { sessionId } = await params;
    const payload = await getScoreboardPayloadBySessionId(sessionId);
    return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Failed to load session scoreboard payload", error);
    return NextResponse.json({ error: "Unable to load scoreboard." }, { status: 500 });
  }
}
