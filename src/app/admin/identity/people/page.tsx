import { getIdentityPeople } from "@/lib/services/identity-platform";

export const dynamic = "force-dynamic";

export default async function IdentityPeoplePage() {
  const people = await getIdentityPeople().catch((error: unknown) => {
    console.error("Failed to load identity people", error);
    return [];
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Identity Platform</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">People</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
        People are the shared identity graph records that can later connect to users, family members, team members, coaches, players, staff, and fans.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {people.length > 0 ? people.map((person) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm" key={person.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{person.displayName}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{person.email ?? "No email"}</p>
              </div>
              <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                {person.personType}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <div><dt className="font-black">Organization</dt><dd className="break-all text-[var(--muted)]">{person.organizationId ?? "Unscoped"}</dd></div>
              <div><dt className="font-black">User link</dt><dd className="break-all text-[var(--muted)]">{person.userId ?? "Not linked"}</dd></div>
              <div><dt className="font-black">Phone</dt><dd className="text-[var(--muted)]">{person.phone ?? "Not provided"}</dd></div>
            </dl>
          </article>
        )) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6 sm:col-span-2 xl:col-span-3">
            <h2 className="text-xl font-black">No people yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Add person records through a trusted admin workflow after the identity graph migration is applied.</p>
          </div>
        )}
      </div>
    </section>
  );
}
