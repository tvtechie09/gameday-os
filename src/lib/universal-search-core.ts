export const UNIVERSAL_SEARCH_RESULT_TYPES = ["field", "game", "work_order", "team", "player"] as const;

export type UniversalSearchResultType = typeof UNIVERSAL_SEARCH_RESULT_TYPES[number];

export type UniversalSearchResult = {
  type: UniversalSearchResultType;
  title: string;
  subtitle: string;
  href: string;
  status?: string;
  relevance: number;
  icon?: "field" | "game" | "work-order" | "team" | "player";
};

export type UniversalSearchCandidate = UniversalSearchResult & {
  identifier?: string;
  secondary?: string[];
  current?: boolean;
};

export const SEARCH_RESULT_TYPE_ORDER: UniversalSearchResultType[] = ["field", "game", "work_order", "team", "player"];

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compact(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function rankSearchCandidate(candidate: UniversalSearchCandidate, query: string): number | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;
  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  const title = normalizeSearchText(candidate.title);
  const identifier = normalizeSearchText(candidate.identifier ?? "");
  const secondary = normalizeSearchText([candidate.subtitle, ...(candidate.secondary ?? [])].join(" "));
  const haystack = `${title} ${identifier} ${secondary}`.trim();
  if (!queryTerms.every((term) => haystack.includes(term))) return null;

  let score = 100;
  if (title === normalizedQuery || compact(candidate.title) === compact(query)) score = 500;
  else if (identifier && (identifier === normalizedQuery || compact(identifier) === compact(query))) score = 460;
  else if (title.startsWith(normalizedQuery)) score = 400;
  else if (title.includes(normalizedQuery)) score = 320;
  else if (identifier.includes(normalizedQuery)) score = 280;
  else if (secondary.includes(normalizedQuery)) score = 180;
  if (candidate.current) score += 20;
  return score;
}

export function searchCandidates(candidates: UniversalSearchCandidate[], query: string, limit = 20): UniversalSearchResult[] {
  return candidates
    .map((candidate, index) => ({ candidate, index, score: rankSearchCandidate(candidate, query) }))
    .filter((entry): entry is typeof entry & { score: number } => entry.score !== null)
    .sort((left, right) => right.score - left.score
      || SEARCH_RESULT_TYPE_ORDER.indexOf(left.candidate.type) - SEARCH_RESULT_TYPE_ORDER.indexOf(right.candidate.type)
      || left.candidate.title.localeCompare(right.candidate.title)
      || left.index - right.index)
    .slice(0, Math.max(1, Math.min(limit, 50)))
    .map(({ candidate, score }) => ({
      type: candidate.type,
      title: candidate.title,
      subtitle: candidate.subtitle,
      href: candidate.href,
      status: candidate.status,
      relevance: score,
      icon: candidate.icon,
    }));
}
