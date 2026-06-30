import { getIdentityFamilies, getIdentityFamilyMembers, getIdentityPeople } from "@/lib/services/identity-platform";

export const dynamic = "force-dynamic";

export default async function IdentityFamiliesPage() {
  const [families, familyMembers, people] = await Promise.all([
    getIdentityFamilies().catch((error: unknown) => {
      console.error("Failed to load identity families", error);
      return [];
    }),
    getIdentityFamilyMembers().catch((error: unknown) => {
      console.error("Failed to load identity family members", error);
      return [];
    }),
    getIdentityPeople().catch((error: unknown) => {
      console.error("Failed to load identity people for families", error);
      return [];
    }),
  ]);
  const peopleById = new Map(people.map((person) => [person.id, person]));

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Identity Platform</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Families</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
        Families connect guardians, players, relatives, and future fan/follower access without requiring full authentication yet.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {families.length > 0 ? families.map((family) => {
          const members = familyMembers.filter((member) => member.familyId === family.id);
          return (
            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm" key={family.id}>
              <h2 className="text-xl font-black">{family.name}</h2>
              <p className="mt-1 break-all text-sm font-semibold text-[var(--muted)]">{family.organizationId ?? "Unscoped organization"}</p>
              <div className="mt-4 grid gap-2">
                {members.length > 0 ? members.map((member) => {
                  const person = peopleById.get(member.personId);
                  return (
                    <div className="rounded-lg bg-[var(--background)] p-3" key={member.id}>
                      <p className="font-black">{person?.displayName ?? member.personId}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {member.relationship}{member.isPrimaryGuardian ? " · primary guardian" : ""}
                      </p>
                    </div>
                  );
                }) : (
                  <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No family members linked yet.</p>
                )}
              </div>
            </article>
          );
        }) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6 lg:col-span-2">
            <h2 className="text-xl font-black">No families yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Families are ready for parent/guardian modeling once trusted admin creation workflows are added.</p>
          </div>
        )}
      </div>
    </section>
  );
}
