import { getIdentityTeamMembers, getIdentityTeams, getIdentityTeamSessionLinks } from "@/lib/services/identity-platform";

export const dynamic = "force-dynamic";

export default async function IdentityTeamsPage() {
  const [teams, teamMembers, sessionLinks] = await Promise.all([
    getIdentityTeams().catch((error: unknown) => {
      console.error("Failed to load identity teams", error);
      return [];
    }),
    getIdentityTeamMembers().catch((error: unknown) => {
      console.error("Failed to load identity team members", error);
      return [];
    }),
    getIdentityTeamSessionLinks().catch((error: unknown) => {
      console.error("Failed to load team session links", error);
      return [];
    }),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Identity Platform</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Teams</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
        Teams are the planning bridge between GameDay Team and GameDay Venue. The v1 foundation supports team members and placeholder team-to-session links without roster sync.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {teams.length > 0 ? teams.map((team) => {
          const members = teamMembers.filter((member) => member.teamId === team.id);
          const links = sessionLinks.filter((link) => link.teamId === team.id);
          return (
            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm" key={team.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">{team.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{team.seasonName ?? "No season"} · {team.ageGroup ?? "No age group"}</p>
                </div>
                <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{team.sportType}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Summary label="Members" value={members.length} />
                <Summary label="Session Links" value={links.length} />
              </div>
              <p className="mt-4 break-all text-xs font-semibold text-[var(--muted)]">Organization: {team.organizationId ?? "Unscoped"}</p>
              <p className="mt-1 break-all text-xs font-semibold text-[var(--muted)]">Venue: {team.venueId ?? "Not venue-linked"}</p>
            </article>
          );
        }) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6 lg:col-span-2">
            <h2 className="text-xl font-black">No teams yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The team graph is ready for future GameDay Team integration and session assignment workflows.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
    </div>
  );
}
