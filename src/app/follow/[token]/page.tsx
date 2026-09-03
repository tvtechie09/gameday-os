import Link from "next/link";
import { getFollowPreferences } from "@/lib/services/follows";
import { PreferenceForm } from "./preference-form";

export const dynamic = "force-dynamic";

type FollowPreferencesPageProps = { params: Promise<{ token: string }> };

export default async function FollowPreferencesPage({ params }: FollowPreferencesPageProps) {
  const token = (await params).token;
  const preferences = await getFollowPreferences(token).catch(() => null);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <section className="mx-auto max-w-lg rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">GameDay updates</p>
        <h1 className="mt-2 text-3xl font-black">Manage notifications</h1>
        {preferences ? (
          <>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {preferences.email ? `Updates for ${preferences.email}.` : "This follow does not have an email address."} No account or password required.
            </p>
            <PreferenceForm initialEmailEnabled={preferences.emailEnabled} initialNotificationLevel={preferences.notificationLevel} token={token} />
          </>
        ) : (
          <div className="mt-6 rounded-lg bg-amber-50 p-4">
            <h2 className="font-black text-amber-950">This link is no longer available</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">Scan the field QR code and follow again to create a new preference link.</p>
          </div>
        )}
        <Link className="mt-6 inline-flex min-h-11 items-center text-sm font-black text-[var(--accent-strong)]" href="/">Return to GameDay OS</Link>
      </section>
    </main>
  );
}
