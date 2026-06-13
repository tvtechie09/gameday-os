import Link from "next/link";
import { getNotificationTypeClass, getNotificationTypeLabel, getNotifications, notificationTypes } from "@/lib/services/notifications";
import type { NotificationType } from "@/lib/types";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams?: Promise<{
    type?: string;
  }>;
};

function readNotificationType(value: string | undefined): NotificationType | "all" {
  return notificationTypes.find((type) => type === value) ?? "all";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedType = readNotificationType(resolvedSearchParams?.type);
  const notifications = await getNotifications(selectedType);

  const filterItems: Array<{ href: string; label: string; value: NotificationType | "all" }> = [
    { href: "/admin/notifications", label: "All", value: "all" },
    ...notificationTypes.map((type) => ({
      href: `/admin/notifications?type=${type}`,
      label: getNotificationTypeLabel(type),
      value: type,
    })),
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Notifications</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Event inbox</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Central framework events for alerts, field status changes, sessions, resources, volunteers, and sponsors. No email, SMS, or push delivery is enabled.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-4 sm:min-w-40">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Total</p>
          <p className="mt-1 text-3xl font-black">{notifications.length}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filterItems.map((item) => {
          const active = selectedType === item.value;

          return (
            <Link
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${active ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              href={item.href}
              key={item.value}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4">
        {notifications.length > 0 ? notifications.map((notification) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={notification.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getNotificationTypeClass(notification.notificationType)}`}>
                  {getNotificationTypeLabel(notification.notificationType)}
                </span>
                <h2 className="mt-3 text-xl font-black">{notification.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{notification.message}</p>
              </div>
              <p className="text-sm font-bold text-[var(--muted)]">{formatDateTime(notification.createdAt)}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
              {notification.venueId ? <span className="rounded-md bg-[var(--background)] px-2 py-1">Venue linked</span> : null}
              {notification.fieldId ? <span className="rounded-md bg-[var(--background)] px-2 py-1">Field linked</span> : null}
              {notification.sessionId ? <span className="rounded-md bg-[var(--background)] px-2 py-1">Session linked</span> : null}
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-black">No notifications yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">New framework events will appear here after alerts, status changes, sessions, resources, or volunteer approvals occur.</p>
          </div>
        )}
      </div>
    </section>
  );
}
