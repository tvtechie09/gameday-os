import { getFields } from "@/lib/services/fields";
import { publicErrorMessage } from "@/lib/public-error";
import { getTeamDivisions } from "./actions";
import { ScheduleGeneratorTool } from "./generator-tool";

export const dynamic = "force-dynamic";

export default async function ScheduleGeneratorPage() {
  let fields: Array<{ id: string; name: string }> = [];
  let errorMessage: string | null = null;
  let divisions: Awaited<ReturnType<typeof getTeamDivisions>> = [];
  try {
    [fields, divisions] = await Promise.all([
      getFields().then((items) => items.map((field) => ({ id: field.id, name: field.name }))),
      getTeamDivisions()
    ]);
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load fields for the generator.");
  }
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Schedule &amp; Games</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Generate a league schedule</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Round-robin for house leagues: every team plays every team, balanced home/away, spread across your fields and dates. Load teams straight from a GameDay Team division and the games arrive linked — standings and family calendars follow automatically.
      </p>
      <div className="mt-6">
        {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{errorMessage}</p> : <ScheduleGeneratorTool fields={fields} divisions={divisions} />}
      </div>
    </div>
  );
}
