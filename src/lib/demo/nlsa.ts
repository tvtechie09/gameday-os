export type NlsaPitchStatus = "OPEN" | "HOLD" | "CLOSED" | "MOVED";
export type NlsaMatchStatus = "SCHEDULED" | "LIVE" | "DELAYED" | "MOVED";

export type NlsaPitch = {
  id: string;
  name: string;
  complexName: string;
  status: NlsaPitchStatus;
  note?: string;
};

export type NlsaMatch = {
  id: string;
  division: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  pitchId: string;
  status: NlsaMatchStatus;
  source: "SprocketSports" | "Manual" | "Venue";
  note?: string;
};

export const nlsaDemoPitches: NlsaPitch[] = [
  { id: "north-1", name: "Pitch 1", complexName: "North Complex", status: "OPEN" },
  { id: "north-2", name: "Pitch 2", complexName: "North Complex", status: "HOLD", note: "Lightning hold" },
  { id: "north-3", name: "Pitch 3", complexName: "North Complex", status: "MOVED", note: "Match moved to Pitch 5" },
  { id: "south-4", name: "Pitch 4", complexName: "South Complex", status: "OPEN" },
  { id: "south-5", name: "Pitch 5", complexName: "South Complex", status: "OPEN", note: "Receiving moved U12 match" },
  { id: "south-6", name: "Pitch 6", complexName: "South Complex", status: "OPEN" },
];

export const nlsaDemoMatches: NlsaMatch[] = [
  {
    id: "u8-1",
    division: "U8 Coed",
    homeTeam: "NLSA Green",
    awayTeam: "Frankfort Blue",
    kickoff: "9:00 AM",
    pitchId: "north-1",
    status: "LIVE",
    source: "SprocketSports",
  },
  {
    id: "u10-1",
    division: "U10 Girls",
    homeTeam: "NLSA White",
    awayTeam: "Mokena Red",
    kickoff: "10:30 AM",
    pitchId: "north-2",
    status: "DELAYED",
    source: "SprocketSports",
    note: "Lightning hold; reassess at 10:20 AM",
  },
  {
    id: "u12-1",
    division: "U12 Boys",
    homeTeam: "NLSA Green",
    awayTeam: "Orland Park Navy",
    kickoff: "11:00 AM",
    pitchId: "south-5",
    status: "MOVED",
    source: "SprocketSports",
    note: "Originally Pitch 3; moved to Pitch 5",
  },
  {
    id: "u14-1",
    division: "U14 Girls",
    homeTeam: "NLSA White",
    awayTeam: "Tinley Park Gold",
    kickoff: "12:30 PM",
    pitchId: "south-4",
    status: "SCHEDULED",
    source: "SprocketSports",
  },
  {
    id: "u10-2",
    division: "U10 Coed",
    homeTeam: "NLSA Black",
    awayTeam: "Homer Glen Orange",
    kickoff: "1:00 PM",
    pitchId: "south-6",
    status: "SCHEDULED",
    source: "Manual",
    note: "Added by NLSA operations for demo scenario",
  },
];

export const nlsaDemoOps = {
  organization: "New Lenox Soccer Association — Demo",
  publicLabel: "Nurve Sports Platform",
  sourceOfTruth: "SprocketSports",
  matchesToday: nlsaDemoMatches.length,
  unresolvedActions: [
    "Confirm lightning all-clear for Pitch 2",
    "Verify signage and volunteer routing for Pitch 3 → Pitch 5 move",
    "Inspect loose net anchor reported on Pitch 6",
  ],
  staffing: {
    status: "2 attention items",
    details: "One field marshal gap at North Complex; one referee confirmation pending for U14.",
  },
  familyContext: {
    parking: "Use the lot assigned to the complex shown with your match.",
    services: "Restrooms, first aid, and concessions are shown by complex in the family experience.",
  },
} as const;

export function getNlsaPitch(pitchId: string) {
  return nlsaDemoPitches.find((pitch) => pitch.id === pitchId);
}
