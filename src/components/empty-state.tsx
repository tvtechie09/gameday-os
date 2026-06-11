import Link from "next/link";

type EmptyStateProps = {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ title, message, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line)] bg-white p-6 text-center">
      <div className="mx-auto mb-4 h-2 w-16 rounded-full bg-[var(--accent)]" />
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{message}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
