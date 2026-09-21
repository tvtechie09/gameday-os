// Passive Fair-Play controller output parser.
//
// MP-70/MP-73 installations can expose an RS-232 character-generator output.
// Field layouts vary by controller sport configuration, so this first adapter
// deliberately accepts only labelled VCG text or JSON from an approved local
// decoder. Unknown frames fail closed and may be recorded for field validation.

function numberAfter(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`(?:^|[\\s,;|])${label}\\s*[:=]?\\s*(\\d{1,3})(?=$|[\\s,;|])`, "i"));
    if (match) return Number(match[1]);
  }
  return null;
}

function textAfter(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`(?:^|[\\s,;|])${label}\\s*[:=]?\\s*([A-Za-z0-9:.+-]+)(?=$|[\\s,;|])`, "i"));
    if (match) return match[1];
  }
  return null;
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = {
    homeScore: Number(value.homeScore ?? value.home_score),
    awayScore: Number(value.awayScore ?? value.away_score ?? value.visitorScore ?? value.visitor_score),
    inning: Number(value.inning),
    balls: Number(value.balls),
    strikes: Number(value.strikes),
    outs: Number(value.outs),
    gameClock: value.gameClock ?? value.game_clock ?? value.clock ?? null,
    topBottom: value.topBottom ?? value.top_bottom ?? value.inning_half ?? null,
    status: value.status ?? "active",
  };
  if (!Number.isFinite(state.homeScore) || !Number.isFinite(state.awayScore)) return null;
  for (const key of ["inning", "balls", "strikes", "outs"]) {
    if (!Number.isFinite(state[key])) state[key] = null;
  }
  const half = String(state.topBottom ?? "").toLowerCase();
  state.topBottom = half === "top" || half === "t" ? "top" : half === "bottom" || half === "bot" || half === "b" ? "bottom" : null;
  state.gameClock = typeof state.gameClock === "string" && state.gameClock.trim() ? state.gameClock.trim() : null;
  return state;
}

export function parseFairPlayFrame(frame) {
  const text = Buffer.isBuffer(frame) ? frame.toString("latin1").trim() : String(frame ?? "").trim();
  if (!text) return null;
  if (text.startsWith("{")) {
    try { return normalizeObject(JSON.parse(text)); } catch { return null; }
  }

  const homeScore = numberAfter(text, ["HOME", "H"]);
  const awayScore = numberAfter(text, ["VISITOR", "GUEST", "AWAY", "V"]);
  if (homeScore === null || awayScore === null) return null;
  return normalizeObject({
    homeScore,
    awayScore,
    inning: numberAfter(text, ["INNING", "INN"]),
    balls: numberAfter(text, ["BALLS", "BALL"]),
    strikes: numberAfter(text, ["STRIKES", "STRIKE"]),
    outs: numberAfter(text, ["OUTS", "OUT"]),
    gameClock: textAfter(text, ["CLOCK", "TIME"]),
    topBottom: textAfter(text, ["HALF", "TOPBOTTOM"]),
    status: "active",
  });
}
