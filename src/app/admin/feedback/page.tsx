import { FeedbackForm } from "./feedback-form";

export const dynamic = "force-dynamic";

export default function FeedbackPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Feedback</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Send feedback</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Tell the GameDay product team what was confusing, broken, or worth improving. This is for product feedback—not an urgent field, scoreboard, or facility issue.
      </p>
      <p className="mt-3 max-w-2xl rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-950">
        Need something fixed at the venue? Use Work Orders so the on-site team can own and resolve it.
      </p>
      <div className="mt-6">
        <FeedbackForm />
      </div>
    </div>
  );
}
