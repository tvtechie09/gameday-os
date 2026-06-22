import type { Organization } from "@/lib/types";

export const demoClientOrganizationNames = [
  "Illinois Celtics",
  "New Lenox Baseball",
  "New Lenox Soccer",
  "Crossroads",
] as const;

const demoClientNameSet = new Set<string>(demoClientOrganizationNames);

export function isDemoClientOrganization(organization: Organization) {
  return demoClientNameSet.has(organization.name);
}

export function getDemoClientOrganizations(organizations: Organization[]) {
  return demoClientOrganizationNames
    .map((name) => organizations.find((organization) => organization.name === name))
    .filter((organization): organization is Organization => Boolean(organization));
}

export function getDemoClientOptionState(name: string, organizations: Organization[]) {
  return organizations.find((organization) => organization.name === name) ?? null;
}
