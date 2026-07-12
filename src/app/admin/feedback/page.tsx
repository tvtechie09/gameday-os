import { FeedbackForm } from "./feedback-form";

export const dynamic = "force-dynamic";

export default function FeedbackPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Feedback</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Send feedback</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Concern, complaint, or idea — it goes straight to the people building GameDay OS. Your name and role are attached automatically.
      </p>
      <div className="mt-6">
        <FeedbackForm defaultRole="venue" />
      </div>
    </div>
  );
}
