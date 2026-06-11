export type VenueStatus = "Draft" | "Live";
export type FieldStatus = "Ready" | "Maintenance" | "Weather hold";
export type SessionStatus = "scheduled" | "active" | "final";
export type SponsorStatus = "Active" | "Draft";

export interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  city?: string;
  state?: string;
  parkingNote: string;
  fieldCount: number;
  status: VenueStatus;
}

export interface Field {
  id: string;
  venueId: string;
  name: string;
  sportType: string;
  surface?: string;
  status: FieldStatus;
  qrPath: string;
  resources: string[];
}

export interface Session {
  id: string;
  fieldId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: SessionStatus;
}

export interface Sponsor {
  id: string;
  name: string;
  placement: string;
  status: SponsorStatus;
}

export interface SponsorAssignment {
  id: string;
  sponsorId: string;
  fieldId: string | null;
  sessionId: string | null;
  placement: string;
  startsAt: string | null;
  endsAt: string | null;
}
