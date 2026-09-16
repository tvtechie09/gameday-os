export type SearchableSession = {
  title: string;
  homeTeam: string;
  awayTeam: string;
  fieldName: string;
  venueName: string;
  tournamentName?: string | null;
  startLabel: string;
  sportType: string;
};

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function sessionMatchesQuery(session: SearchableSession, query: string): boolean {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalize([
    session.title,
    session.homeTeam,
    session.awayTeam,
    session.fieldName,
    session.venueName,
    session.tournamentName ?? "",
    session.startLabel,
    session.sportType,
  ].join(" "));
  return terms.every((term) => haystack.includes(term));
}
