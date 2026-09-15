export type NlsaScenarioKey = "normal" | "lightning" | "recovery";
export type NlsaSource = "SprocketSports" | "Manual" | "Venue";
export type NlsaPitchState = "OPEN" | "HOLD" | "CLOSED";
export type NlsaMatchState = "SCHEDULED" | "HOLD" | "DELAYED" | "MOVED";

export type NlsaPitch = {
  id: string;
  complex: string;
  name: string;
  state: NlsaPitchState;
  note: string;
};

export type NlsaMatch = {
  id: string;
  division: string;
  home: string;
  away: string;
  kickoff: string;
  originalKickoff?: string;
  complex: string;
  pitch: string;
  originalPitch?: string;
  state: NlsaMatchState;
  referee: string;
  source: NlsaSource;
  affected: boolean;
};

export type NlsaScenario = {
  key: NlsaScenarioKey;
  label: string;
  weather: string;
  summary: string;
  nextAction: string;
  pitches: NlsaPitch[];
  matches: NlsaMatch[];
  issues: Array<{ id: string; title: string; detail: string; owner: string; status: string }>;
  staffing: Array<{ area: string; status: "COVERED" | "NEEDS HELP"; detail: string }>;
  announcements: Array<{ audience: string; message: string; source: NlsaSource }>;
  history: Array<{ time: string; event: string; actor: string }>;
};

export const nlsaDemo = {
  organization: "New Lenox Soccer Association — Demo",
  dateLabel: "Saturday, September 19",
  timezone: "Central Time",
  integration: {
    provider: "SprocketSports",
    mode: "Read-only source placeholder",
    state: "Partner access required — no live connection",
    explanation: "Registration, teams, and schedule remain in SprocketSports. This demo shows how source-attributed records can power day-of operations without replacing the league system.",
  },
  complexes: [
    { name: "Lincoln-Way Soccer Complex", address: "Synthetic demo location · New Lenox, IL", parking: "Use the north lot for Pitches 1–4 and west lot for Pitches 5–8.", restrooms: "Permanent restrooms beside the central pavilion.", firstAid: "First aid at the operations tent between Pitches 3 and 5.", concessions: "Open at the central pavilion from 8:00 AM–3:00 PM." },
    { name: "Haines Wayside Park", address: "Synthetic demo location · New Lenox, IL", parking: "Enter from the east drive; overflow parking is signed.", restrooms: "Portable restrooms next to Pitch 10.", firstAid: "Field marshal at Pitch 10 has the first-aid kit.", concessions: "Mobile concessions near the east entrance." },
  ],
  identity: {
    canonicalPerson: "Jordan Rivera (synthetic)",
    sourceIdentity: "SprocketSports member SP-DEMO-1042",
    relationship: "LINKED",
    provenance: "Confirmed by an authorized NLSA reviewer; source record retained.",
    possibleMatch: "Taylor Morgan remains POSSIBLE_MATCH pending review.",
    distinct: "Two Alex Lee records are marked DISTINCT and kept separate.",
    reversibility: "The link can be reversed without deleting either source record.",
  },
} as const;

const basePitches: NlsaPitch[] = [
  { id: "pitch-1", complex: "Lincoln-Way Soccer Complex", name: "Pitch 1", state: "OPEN", note: "Match-ready" },
  { id: "pitch-2", complex: "Lincoln-Way Soccer Complex", name: "Pitch 2", state: "OPEN", note: "Match-ready" },
  { id: "pitch-3", complex: "Lincoln-Way Soccer Complex", name: "Pitch 3", state: "OPEN", note: "Match-ready" },
  { id: "pitch-4", complex: "Lincoln-Way Soccer Complex", name: "Pitch 4", state: "OPEN", note: "Match-ready" },
  { id: "pitch-5", complex: "Lincoln-Way Soccer Complex", name: "Pitch 5", state: "OPEN", note: "Available recovery capacity" },
  { id: "pitch-10", complex: "Haines Wayside Park", name: "Pitch 10", state: "OPEN", note: "Match-ready" },
];

const baseMatches: NlsaMatch[] = [
  { id: "match-u8-1", division: "U8 Coed", home: "NLSA Foxes", away: "Frankfort Blue", kickoff: "8:30 AM", complex: "Lincoln-Way Soccer Complex", pitch: "Pitch 1", state: "SCHEDULED", referee: "Assigned · check-in pending", source: "SprocketSports", affected: false },
  { id: "match-u10-1", division: "U10 Girls", home: "NLSA United", away: "Mokena Red", kickoff: "9:00 AM", complex: "Lincoln-Way Soccer Complex", pitch: "Pitch 3", state: "SCHEDULED", referee: "Checked in", source: "SprocketSports", affected: false },
  { id: "match-u12-1", division: "U12 Boys", home: "NLSA U12 Green", away: "Homer Storm", kickoff: "10:15 AM", complex: "Lincoln-Way Soccer Complex", pitch: "Pitch 3", state: "SCHEDULED", referee: "Assigned", source: "SprocketSports", affected: false },
  { id: "match-u12-2", division: "U12 Girls", home: "NLSA Lightning", away: "Orland Park Select", kickoff: "10:30 AM", complex: "Lincoln-Way Soccer Complex", pitch: "Pitch 4", state: "SCHEDULED", referee: "Coverage needed", source: "SprocketSports", affected: false },
  { id: "match-u14-1", division: "U14 Boys", home: "NLSA Premier", away: "Tinley Park Gold", kickoff: "11:45 AM", complex: "Lincoln-Way Soccer Complex", pitch: "Pitch 5", state: "SCHEDULED", referee: "Assigned", source: "SprocketSports", affected: false },
  { id: "match-u10-2", division: "U10 Boys", home: "NLSA Strikers", away: "Joliet United", kickoff: "12:15 PM", complex: "Haines Wayside Park", pitch: "Pitch 10", state: "SCHEDULED", referee: "Assigned", source: "SprocketSports", affected: false },
];

function normalScenario(): NlsaScenario {
  return {
    key: "normal",
    label: "Normal schedule",
    weather: "Dry conditions · lightning monitoring active",
    summary: "Six matches are on plan across two complexes.",
    nextAction: "Confirm the U12 Girls referee and damaged-net repair before 10:00 AM.",
    pitches: basePitches,
    matches: baseMatches,
    issues: [{ id: "issue-net", title: "Damaged side net · Pitch 4", detail: "Replacement ties requested before the 10:30 AM kickoff.", owner: "Field crew", status: "IN PROGRESS" }],
    staffing: [
      { area: "Field marshals", status: "COVERED", detail: "4 of 4 checked in" },
      { area: "Referees", status: "NEEDS HELP", detail: "U12 Girls center referee unconfirmed" },
      { area: "Concessions", status: "COVERED", detail: "Morning shift staffed" },
    ],
    announcements: [{ audience: "All families", message: "Saturday schedule is on time. Check your match card before leaving home.", source: "Manual" }],
    history: [
      { time: "7:42 AM", event: "Pitch inspection completed", actor: "NLSA Operations" },
      { time: "7:51 AM", event: "Schedule snapshot normalized from simulated source", actor: "SprocketSports placeholder" },
    ],
  };
}

function lightningScenario(): NlsaScenario {
  const matches = baseMatches.map((match): NlsaMatch => {
    if (match.id === "match-u12-1") return { ...match, pitch: "Pitch 5", originalPitch: "Pitch 3", state: "MOVED", affected: true };
    if (match.id === "match-u12-2") return { ...match, kickoff: "11:00 AM", originalKickoff: "10:30 AM", state: "DELAYED", affected: true };
    if (match.id === "match-u10-1") return { ...match, state: "HOLD", affected: true };
    if (match.id === "match-u14-1") return { ...match, kickoff: "12:15 PM", originalKickoff: "11:45 AM", state: "DELAYED", affected: true };
    return match;
  });
  return {
    key: "lightning",
    label: "Lightning disruption",
    weather: "LIGHTNING HOLD · last strike inside safety radius at 9:36 AM",
    summary: "Two pitches are held, one match moved, and two kickoff times need attention.",
    nextAction: "Approve the 30-minute cascade and confirm referee coverage for the moved U12 match.",
    pitches: basePitches.map((pitch) => ["pitch-3", "pitch-4"].includes(pitch.id) ? { ...pitch, state: "HOLD", note: "Lightning safety hold" } : pitch),
    matches,
    issues: [
      { id: "issue-weather", title: "Lightning safety hold", detail: "Pitches 3 and 4 held pending the all-clear timer.", owner: "NLSA Operations", status: "OPEN" },
      { id: "issue-net", title: "Damaged side net · Pitch 4", detail: "Repair paused during the weather hold.", owner: "Field crew", status: "BLOCKED" },
    ],
    staffing: [
      { area: "Field marshals", status: "COVERED", detail: "Marshals redirecting arrivals" },
      { area: "Referees", status: "NEEDS HELP", detail: "Moved U12 match needs coverage confirmation" },
      { area: "Concessions", status: "COVERED", detail: "Pavilion serving as shelter check-in" },
    ],
    announcements: [
      { audience: "Pitch 3 teams", message: "U12 Boys: report to Pitch 5. Kickoff remains 10:15 AM.", source: "Venue" },
      { audience: "Pitch 4 teams", message: "U12 Girls kickoff moved to 11:00 AM. Remain in a safe location until the all-clear.", source: "Venue" },
    ],
    history: [
      { time: "9:36 AM", event: "Lightning hold opened for Pitches 3 and 4", actor: "NLSA Operations" },
      { time: "9:39 AM", event: "U12 Boys moved from Pitch 3 to Pitch 5", actor: "NLSA Operations" },
      { time: "9:41 AM", event: "U12 Girls and U14 Boys kickoff cascade recorded", actor: "NLSA Operations" },
      { time: "9:43 AM", event: "Audience-specific alerts prepared", actor: "Nurve Sports Operations" },
    ],
  };
}

function recoveryScenario(): NlsaScenario {
  const disruption = lightningScenario();
  return {
    ...disruption,
    key: "recovery",
    label: "All-clear recovery",
    weather: "ALL CLEAR · play may resume after pitch inspection",
    summary: "Held pitches reopened; the Pitch 3 to Pitch 5 move remains in effect to protect the revised schedule.",
    nextAction: "Confirm the 11:00 AM restart and close the damaged-net issue after inspection.",
    pitches: disruption.pitches.map((pitch) => ["pitch-3", "pitch-4"].includes(pitch.id) ? { ...pitch, state: "OPEN", note: "Inspected after all-clear" } : pitch),
    issues: disruption.issues.map((issue) => issue.id === "issue-weather" ? { ...issue, status: "RESOLVED", detail: "All-clear recorded; pitches inspected and reopened." } : { ...issue, status: "IN PROGRESS" }),
    announcements: [{ audience: "Affected teams", message: "All-clear: play is resuming. U12 Boys remains on Pitch 5; U12 Girls begins at 11:00 AM.", source: "Venue" }],
    history: [...disruption.history, { time: "10:08 AM", event: "All-clear recorded; Pitches 3 and 4 reopened", actor: "NLSA Operations" }],
  };
}

export function getNlsaScenario(value: string | undefined): NlsaScenario {
  if (value === "lightning") return lightningScenario();
  if (value === "recovery") return recoveryScenario();
  return normalScenario();
}

export function getCoachMatch(scenario: NlsaScenario): NlsaMatch {
  const match = scenario.matches.find((item) => item.id === "match-u12-1");
  if (!match) throw new Error("NLSA coach match fixture is missing");
  return match;
}

export function getFamilyComplex(match: NlsaMatch) {
  const complex = nlsaDemo.complexes.find((item) => item.name === match.complex);
  if (!complex) throw new Error("NLSA family complex fixture is missing");
  return complex;
}
