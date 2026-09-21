export type FairPlayScoreboardState = {
  awayScore: number;
  balls: number | null;
  gameClock: string | null;
  homeScore: number;
  inning: number | null;
  outs: number | null;
  status: string;
  strikes: number | null;
  topBottom: "top" | "bottom" | null;
};

export function parseFairPlayFrame(frame: string | Buffer): FairPlayScoreboardState | null;
