import { updateSessionGameState } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";

export type DemoScoreboardAction = "start" | "home_plus_one" | "away_plus_one" | "next_period" | "reset";

function nextDemoPeriod(session: Session) {
  if (session.sportType === "baseball" || session.sportType === "softball") {
    return {
      inning: session.inningHalf === "bottom" ? session.inning + 1 : session.inning,
      inningHalf: session.inningHalf === "bottom" ? "top" as const : "bottom" as const,
    };
  }

  return {
    inning: session.inning + 1,
    inningHalf: session.inningHalf,
  };
}

export async function applyDemoScoreboardAction(session: Session, action: DemoScoreboardAction) {
  if (!session.isDemo) {
    throw new Error("Demo controls are locked for real sessions. Mark this session as demo before running scoreboard demos.");
  }

  const nextPeriod = nextDemoPeriod(session);

  const nextState = {
    away_score: session.awayScore,
    balls: session.balls,
    game_status: session.gameStatus,
    home_score: session.homeScore,
    inning: session.inning,
    inning_half: session.inningHalf,
    notes: session.notes,
    outs: session.outs,
    primary_link_label: session.primaryLinkLabel,
    primary_link_url: session.primaryLinkUrl,
    secondary_link_label: session.secondaryLinkLabel,
    secondary_link_url: session.secondaryLinkUrl,
    strikes: session.strikes,
  };

  if (action === "start") {
    nextState.game_status = "active";
  }

  if (action === "home_plus_one") {
    nextState.home_score += 1;
    nextState.game_status = "active";
  }

  if (action === "away_plus_one") {
    nextState.away_score += 1;
    nextState.game_status = "active";
  }

  if (action === "next_period") {
    nextState.inning = nextPeriod.inning;
    nextState.inning_half = nextPeriod.inningHalf;
    nextState.balls = 0;
    nextState.strikes = 0;
    nextState.outs = 0;
    nextState.game_status = "active";
  }

  if (action === "reset") {
    nextState.away_score = 0;
    nextState.balls = 0;
    nextState.game_status = "scheduled";
    nextState.home_score = 0;
    nextState.inning = 1;
    nextState.inning_half = "top";
    nextState.outs = 0;
    nextState.strikes = 0;
  }

  return updateSessionGameState(session.id, nextState);
}
