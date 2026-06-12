import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTournament, updateTournament } from "@/lib/services/tournaments";

type EditTournamentPageProps = {
  params: Promise<{ tournamentId: string }>;
};

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

export const dynamic = "force-dynamic";

export default async function EditTournamentPage({ params }: EditTournamentPageProps) {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);

  async function updateTournamentAction(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const startDate = String(formData.get("start_date") ?? "").trim();
    const endDate = String(formData.get("end_date") ?? "").trim();

    if (!name || !startDate || !endDate) {
      return;
    }

    await updateTournament(tournamentId, {
      name,
      description: readOptionalText(formData, "description"),
      start_date: startDate,
      end_date: endDate,
      logo_url: readOptionalText(formData, "logo_url"),
      website_url: readOptionalText(formData, "website_url"),
    });

    revalidatePath("/admin/tournaments");
    revalidatePath("/admin/sessions");
    revalidatePath("/fields/[fieldId]", "page");
    redirect("/admin/tournaments");
  }

  if (!tournament) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/tournaments" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to tournaments
        </Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Tournament not found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/tournaments" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to tournaments
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Tournaments</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit tournament</h1>
      </div>
      <form action={updateTournamentAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Tournament name</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={tournament.name} name="name" required />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Start date</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={tournament.startDate} name="start_date" required type="date" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">End date</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={tournament.endDate} name="end_date" required type="date" />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Logo URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={tournament.logoUrl ?? ""} name="logo_url" type="url" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Website URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={tournament.websiteUrl ?? ""} name="website_url" type="url" />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Description</span>
          <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={tournament.description} name="description" />
        </label>
        <div className="flex justify-end border-t border-[var(--line)] pt-5">
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
            Save tournament
          </button>
        </div>
      </form>
    </section>
  );
}
