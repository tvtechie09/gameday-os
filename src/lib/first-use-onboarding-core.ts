import type { NavGroup } from "@/lib/access/navigation";

export const FIRST_USE_ONBOARDING_VERSION = 1;

export type OnboardingProduct = "venue" | "team" | "family";
export type OnboardingOutcome = "completed" | "dismissed";

export type OnboardingConcept = {
  key: string;
  title: string;
  description: string;
  href?: string;
};

export type OnboardingModel = {
  product: OnboardingProduct;
  role: string;
  eyebrow: string;
  title: string;
  description: string;
  concepts: OnboardingConcept[];
  startHref: string;
  startLabel: string;
};

export function onboardingStorageKey(input: { product: OnboardingProduct; role: string; userId: string }): string {
  return `gameday:first-use:${input.product}:${encodeURIComponent(input.role)}:${encodeURIComponent(input.userId)}`;
}

export function hasFinishedOnboarding(value: string | null, version = FIRST_USE_ONBOARDING_VERSION): boolean {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value) as { version?: unknown; outcome?: unknown };
    return parsed.version === version && (parsed.outcome === "completed" || parsed.outcome === "dismissed");
  } catch {
    return false;
  }
}

export function onboardingRecord(outcome: OnboardingOutcome, version = FIRST_USE_ONBOARDING_VERSION): string {
  return JSON.stringify({ version, outcome });
}

export function buildVenueOnboarding(role: string, navGroups: NavGroup[]): OnboardingModel | null {
  if (role !== "venue_director" && role !== "venue_staff") return null;
  const nav = new Map(navGroups.flatMap((group) => group.items).map((item) => [item.key, item]));
  const concept = (key: string, title: string, description: string): OnboardingConcept | null => {
    const item = nav.get(key);
    return item ? { key, title, description, href: item.href } : null;
  };

  if (role === "venue_staff") {
    const concepts = [
      concept("today", "Today", "See what is happening now and what needs attention."),
      concept("fields", "Fields", "Check field status and use the field actions available to you."),
      concept("work-orders", "Work Orders", "Take ownership of operational issues and close them out."),
      navGroups.some((group) => group.key === "admin")
        ? { key: "more", title: "More", description: "Find announcements, Venue Status, and other tools available to you." }
        : null,
    ].filter((item): item is OnboardingConcept => Boolean(item));
    return concepts.length ? {
      product: "venue", role, eyebrow: "Venue Staff", title: "Welcome to GameDay",
      description: "Start with Today when you arrive. You can come back to this guide from More.",
      concepts, startHref: nav.get("today")?.href ?? "/today", startLabel: "Start with Today",
    } : null;
  }

  const concepts = [
    concept("today", "Today", "Your live view of the day and what needs attention."),
    concept("fields", "Fields", "See field status, current and next games, issues, and disruptions."),
    concept("schedule", "Schedule", "Find future games and make schedule changes."),
    navGroups.some((group) => group.key === "admin")
      ? { key: "more", title: "More", description: "Find Work Orders, announcements, Venue Status, and management tools." }
      : null,
  ].filter((item): item is OnboardingConcept => Boolean(item));
  return concepts.length ? {
    product: "venue", role, eyebrow: "Venue GM", title: "Welcome to GameDay",
    description: "Start with Today when you arrive. You can come back to this guide from More.",
    concepts, startHref: nav.get("today")?.href ?? "/today", startLabel: "Start with Today",
  } : null;
}
