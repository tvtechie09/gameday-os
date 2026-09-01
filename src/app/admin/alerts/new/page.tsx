import Link from "next/link";
import { getTournaments } from "@/lib/services/tournaments";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { AlertForm } from "./alert-form";

export const dynamic = "force-dynamic";

type NewAlertPageProps = {
  searchParams?: Promise<{
    weather_delay?: string;
  }>;
};

export default async function NewAlertPage({ searchParams }: NewAlertPageProps) {
  const resolvedSearchParams = await searchParams;
  const [scoped, tournaments] = await Promise.all([getScopedVenuesAndFields(), getTournaments()]);
  const { venues, fields } = scoped;
  const isWeatherDelay = resolvedSearchParams?.weather_delay === "true";

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/alerts" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to alerts
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Communications</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Publish an update</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Write the message and publish window first. Targeting and attention level remain available when needed.
        </p>
      </div>
      <AlertForm
        fields={fields}
        initialValues={isWeatherDelay ? {
          alertPriority: "high",
          alertScope: "venue",
          alertType: "weather",
          message: "Games are delayed while venue staff monitors weather conditions. Please stay close to official venue updates.",
          title: "Weather Delay",
        } : undefined}
        tournaments={tournaments}
        venues={venues}
      />
    </section>
  );
}
