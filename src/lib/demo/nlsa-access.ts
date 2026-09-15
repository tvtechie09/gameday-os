import type { AccessContext } from "../access/capabilities.ts";

export const NLSA_ORGANIZATION_ID = "6e1a0000-0000-4000-8000-000000000001";
export const NLSA_TEAM_ID = "6e1a0000-0000-4000-8000-000000000101";
export const NLSA_FAMILY_ID = "6e1a0000-0000-4000-8000-000000000201";

export type NlsaExperience = "owner" | "operations" | "coach" | "family";

function isNlsaOwner(ctx: AccessContext | null): boolean {
  return Boolean(ctx && ctx.roleKey === "organization_admin" && ctx.scopeType === "organization" && ctx.scopeId === NLSA_ORGANIZATION_ID);
}

function isNlsaStaff(ctx: AccessContext | null): boolean {
  return Boolean(ctx && ctx.roleKey === "league_staff" && ctx.scopeType === "organization" && ctx.scopeId === NLSA_ORGANIZATION_ID);
}

function isNlsaCoach(ctx: AccessContext | null): boolean {
  return Boolean(ctx && ctx.roleKey === "coach" && ctx.scopeType === "team" && ctx.scopeId === NLSA_TEAM_ID);
}

function isNlsaParent(ctx: AccessContext | null): boolean {
  return Boolean(ctx && ctx.roleKey === "parent" && ctx.scopeType === "family" && ctx.scopeId === NLSA_FAMILY_ID);
}

export function canAccessNlsaExperience(ctx: AccessContext | null, experience: NlsaExperience): boolean {
  if (!ctx) return false;
  if (experience === "owner") return isNlsaOwner(ctx);
  if (experience === "operations") return isNlsaOwner(ctx) || isNlsaStaff(ctx);
  if (experience === "coach") return isNlsaCoach(ctx);
  return isNlsaParent(ctx);
}

export function nlsaExperienceForPath(pathname: string): NlsaExperience | null {
  if (pathname === "/demo/nlsa" || pathname === "/demo/nlsa/" || pathname.startsWith("/demo/nlsa/today")) return "owner";
  if (pathname.startsWith("/demo/nlsa/operations")) return "operations";
  if (pathname.startsWith("/demo/nlsa/coach")) return "coach";
  if (pathname.startsWith("/demo/nlsa/family")) return "family";
  return null;
}

export function getNlsaHome(ctx: AccessContext | null): string | null {
  if (isNlsaOwner(ctx)) return "/demo/nlsa/today";
  if (isNlsaStaff(ctx)) return "/demo/nlsa/operations";
  if (isNlsaCoach(ctx)) return "/demo/nlsa/coach";
  if (isNlsaParent(ctx)) return "/demo/nlsa/family";
  return null;
}
