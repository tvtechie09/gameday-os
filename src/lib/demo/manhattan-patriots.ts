export type PatriotsView = "gameday" | "coach" | "family" | "venue";
export type PatriotsScenarioKey = "arrival" | "delay" | "recovery";

export type PatriotsGame = {
  id: string;
  division: "Super Lightweight" | "Lightweight" | "Junior Varsity" | "Varsity";
  opponent: string;
  kickoff: string;
  originalKickoff?: string;
  status: "READY" | "DELAYED" | "RESUMING";
};

export type PatriotsScenario = {
  key: PatriotsScenarioKey;
  label: string;
  time: string;
  headline: string;
  summary: string;
  status: string;
  games: PatriotsGame[];
  issue: { title: string; detail: string; state: "OPEN" | "RESOLVED"; owner: string };
  familyAlert: string;
  coachAction: string;
  activity: Array<{ time: string; label: string; source: string }>;
};

export const patriotsDemo = {
  organization: "Manhattan Patriots Football & Cheer",
  venue: "Lincoln-Way West High School",
  venueAddress: "21701 S. Gougar Road, New Lenox, IL 60451",
  practiceVenue: "Manhattan Intermediate School",
  demoDate: "Synthetic Saturday · September 12",
  sourceBoundary: {
    headline: "Connect the systems already in use",
    body: "GameDay coordinates source-attributed schedules, venue operations and audience updates. It does not replace registration, team communication, scorekeeping, streaming or venue systems.",
    integrations: [
      { name: "Schedule", state: "Simulated import", detail: "Read-only sample records" },
      { name: "Scoreboard + clock", state: "Concept adapter", detail: "No device control" },
      { name: "PA + signage", state: "Draft routing", detail: "No message published" },
      { name: "Video", state: "Placeholder", detail: "No stream connected" },
    ],
  },
  privacy: "No real child or family data. Any future child-data workflow requires joint Legal, Product, Engineering and QA review before use.",
} as const;

const baseGames: PatriotsGame[] = [
  { id: "slw", division: "Super Lightweight", opponent: "Prairie Hawks (synthetic)", kickoff: "9:00 AM", status: "READY" },
  { id: "lw", division: "Lightweight", opponent: "River City Blue (synthetic)", kickoff: "11:00 AM", status: "READY" },
  { id: "jv", division: "Junior Varsity", opponent: "Southland Storm (synthetic)", kickoff: "1:15 PM", status: "READY" },
  { id: "varsity", division: "Varsity", opponent: "Heritage Gold (synthetic)", kickoff: "3:30 PM", status: "READY" },
];

const scenarios: Record<PatriotsScenarioKey, PatriotsScenario> = {
  arrival: {
    key: "arrival", label: "Arrival", time: "8:12 AM", status: "GAME DAY ON PLAN",
    headline: "Four teams. One shared game-day picture.",
    summary: "Coaches, volunteers and families see only what matters to them while game-day leadership sees the full operating plan.",
    games: baseGames,
    issue: { title: "West gate check-in needs one volunteer", detail: "A synthetic coverage gap is flagged before gates open. Assigning a volunteer here does not contact a real person.", state: "OPEN", owner: "Game-day lead (synthetic)" },
    familyAlert: "Welcome to Patriots game day. Your sample arrival card is ready; venue directions are verified, all parking and gate guidance is hypothetical.",
    coachAction: "Confirm the synthetic equipment checklist and review the 8:40 AM warm-up window.",
    activity: [
      { time: "7:38", label: "Sample schedule snapshot staged", source: "Simulated import" },
      { time: "7:52", label: "Volunteer coverage reviewed", source: "Manual demo entry" },
      { time: "8:05", label: "Family arrival card prepared", source: "GameDay demo" },
    ],
  },
  delay: {
    key: "delay", label: "Weather delay", time: "12:47 PM", status: "SIMULATED WEATHER HOLD",
    headline: "One decision becomes a coordinated response.",
    summary: "The demo models a human-approved delay, highlights downstream impact and prepares consistent drafts for each audience.",
    games: baseGames.map((game) => game.id === "jv" ? { ...game, kickoff: "2:00 PM", originalKickoff: game.kickoff, status: "DELAYED" } : game.id === "varsity" ? { ...game, kickoff: "4:15 PM", originalKickoff: game.kickoff, status: "DELAYED" } : game),
    issue: { title: "South sideline audio check requested", detail: "A volunteer submitted a simulated issue. The acknowledgment below updates this browser only—no device or workflow is controlled.", state: "OPEN", owner: "Venue liaison (synthetic)" },
    familyAlert: "Draft only: Junior Varsity and Varsity kickoffs move 45 minutes later. Remain in a safe location and follow venue staff direction.",
    coachAction: "Review the proposed 2:00 PM kickoff and keep the synthetic roster grouped until venue staff provides direction.",
    activity: [
      { time: "12:41", label: "Simulated hold entered by game-day lead", source: "Human decision" },
      { time: "12:43", label: "Two later games identified as affected", source: "GameDay demo" },
      { time: "12:46", label: "Audience-specific drafts prepared", source: "Not sent" },
    ],
  },
  recovery: {
    key: "recovery", label: "Recovery", time: "1:31 PM", status: "SIMULATED RESUMPTION",
    headline: "The plan changes once. Everyone gets the right version.",
    summary: "After a human all-clear, the revised schedule remains visible across coach, family and venue views with an auditable synthetic timeline.",
    games: baseGames.map((game) => game.id === "jv" ? { ...game, kickoff: "2:00 PM", originalKickoff: game.kickoff, status: "RESUMING" } : game.id === "varsity" ? { ...game, kickoff: "4:15 PM", originalKickoff: game.kickoff, status: "RESUMING" } : game),
    issue: { title: "South sideline audio check completed", detail: "The synthetic issue is marked resolved after a manual confirmation. This is not a live equipment-health signal.", state: "RESOLVED", owner: "Venue liaison (synthetic)" },
    familyAlert: "Draft only: The revised schedule is confirmed for this demo. Junior Varsity begins at 2:00 PM and Varsity at 4:15 PM.",
    coachAction: "Begin the synthetic warm-up plan at 1:30 PM and confirm the revised kickoff card with staff.",
    activity: [
      { time: "1:18", label: "Human all-clear simulated", source: "Manual demo entry" },
      { time: "1:23", label: "Revised schedule approved", source: "Human decision" },
      { time: "1:28", label: "Updated audience drafts prepared", source: "Not sent" },
    ],
  },
};

export function getPatriotsScenario(key: PatriotsScenarioKey): PatriotsScenario { return scenarios[key]; }
export const patriotsScenarioKeys = Object.keys(scenarios) as PatriotsScenarioKey[];
export function isPatriotsView(value: string): value is PatriotsView { return ["gameday", "coach", "family", "venue"].includes(value); }
