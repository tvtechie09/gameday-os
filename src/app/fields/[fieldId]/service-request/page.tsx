import Link from "next/link";
import { getField } from "@/lib/services/fields";
import { getSessionsByFieldId } from "@/lib/services/sessions";
import { VenueServiceRequestForm } from "./request-form";

type ServiceRequestPageProps = {
  params: Promise<{ fieldId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ServiceRequestPage({ params, searchParams }: ServiceRequestPageProps) {
  const [{ fieldId }, query] = await Promise.all([params, searchParams]);
  const field = await getField(fieldId);
  const sessions = field ? await getSessionsByFieldId(fieldId) : [];
  const requestedSession = sessions.find((session) => session.id === query.sessionId) ?? null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6">
      <section className="mx-auto max-w-xl">
        <Link className="text-sm font-black text-[var(--accent-strong)] underline" href={`/fields/${fieldId}`}>Back to field</Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Venue Service Requests</p>
        <h1 className="mt-2 text-3xl font-black">Get help at {field?.name ?? "this field"}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Your field is already included from this page{requestedSession ? `, along with ${requestedSession.title}` : ""}.
        </p>
        {field ? (
          <div className="mt-6">
            <VenueServiceRequestForm fieldId={field.id} sessionId={requestedSession?.id ?? null} />
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">This field is not available.</p>
        )}
      </section>
    </main>
  );
}
