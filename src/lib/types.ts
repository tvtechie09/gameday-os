export type VenueStatus = "Draft" | "Live";
export type FieldStatus = "Ready" | "Maintenance" | "Weather hold";
export type SessionStatus = "scheduled" | "active" | "final";
export type InningHalf = "top" | "bottom";
export type SessionLinkLabel = "GameChanger" | "SidelineHD" | "YouTube" | "SportsEngine" | "TeamSnap" | "Other";
export type SponsorAssignmentType = "venue" | "field" | "session";
export type SponsorPlacementLabel = "Presented By" | "Field Sponsor" | "Game Sponsor" | "Featured Sponsor";
export type SponsorAnalyticsRange = "today" | "7d" | "30d" | "all";

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
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  updatedAt: string;
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
  updatedAt: string;
}

export interface Session {
  id: string;
  fieldId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  endTime: string | null;
  status: SessionStatus;
  homeScore: number;
  awayScore: number;
  inning: number;
  inningHalf: InningHalf;
  balls: number;
  strikes: number;
  outs: number;
  gameStatus: SessionStatus;
  primaryLinkLabel: SessionLinkLabel | null;
  primaryLinkUrl: string | null;
  secondaryLinkLabel: SessionLinkLabel | null;
  secondaryLinkUrl: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorAssignment {
  id: string;
  sponsorId: string;
  assignmentType: SponsorAssignmentType;
  venueId: string | null;
  fieldId: string | null;
  sessionId: string | null;
  placementLabel: SponsorPlacementLabel;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorPlacement extends SponsorAssignment {
  sponsor: Sponsor;
}

export interface SponsorAnalyticsSummary {
  sponsorId: string;
  impressions: number;
  clicks: number;
  ctr: number;
}
