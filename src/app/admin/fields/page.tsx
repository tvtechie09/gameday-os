import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { EmptyState, ErrorState, PageShell, PageTitle, buttonStyles } from "@/components/ui/gameday-ui";
import { canManageFields, canManageSchedule, canOpenCloseField, canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { publicErrorMessage } from "@/lib/public-error";
import { buildFieldOperationItems, type FieldOperationItem } from "@/lib/services/field-operations-core";
import { getSessions } from "@/lib/services/sessions";
import { getWorkOrders } from "@/lib/services/work-orders";
import { FieldOperationsBoard } from "./field-operations-board";

export const dynamic = "force-dynamic";

async function loadFieldOperations(): Promise<{ items: FieldOperationItem[]; errorMessage: string | null }> {
  const now = Date.now();
  try {
    const [scoped, sessions, workOrders] = await Promise.all([
      getScopedVenuesAndFields(),
      getSessions(),
      getWorkOrders(),
    ]);
    const items = scoped.venues.flatMap((venue) => buildFieldOperationItems({
      venue,
      fields: scoped.fields.filter((field) => field.venueId === venue.id),
      sessions,
      workOrders,
      now,
    }));
    return { items, errorMessage: null };
  } catch (error) {
    return { items: [], errorMessage: publicErrorMessage(error, "Unable to load field operations.") };
  }
}

export default async function FieldsPage({ searchParams }: { searchParams?: Promise<{ fieldId?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));

  const { items, errorMessage } = await loadFieldOperations();
  const requestedFieldId = (await searchParams)?.fieldId;
  const initialSelectedId = items.some((item) => item.fieldId === requestedFieldId) ? requestedFieldId : undefined;
  const canConfigure = canManageFields(ctx);
  const scheduleAccess = canManageSchedule(ctx);

  return (
    <PageShell size="wide">
      <PageTitle
        actions={canConfigure ? (
          <details className="ui-surface group relative z-20">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-black text-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
              Field tools <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-2 border-t border-[var(--line)] p-3 sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:rounded-xl sm:border sm:bg-white sm:shadow-xl">
              <Link className={buttonStyles("primary", "justify-start")} href="/admin/fields/new">Add field</Link>
              <Link className={buttonStyles("secondary", "justify-start")} href="/admin/fields/bookings">Allocation &amp; permits</Link>
              <Link className={buttonStyles("secondary", "justify-start")} href="/admin/fields/reservations">Coach reservations</Link>
            </div>
          </details>
        ) : undefined}
        description="See the whole complex in seconds. Current play, what is next, field issues, and the safest common action stay together."
        eyebrow="Run today"
        title="Field operations"
      />

      {errorMessage ? (
        <div className="mt-8"><ErrorState message={errorMessage} title="Unable to load fields" /></div>
      ) : items.length > 0 ? (
        <FieldOperationsBoard
          canConfigure={canConfigure}
          canManageSchedule={scheduleAccess}
          canUpdateStatus={canOpenCloseField(ctx)}
          initialSelectedId={initialSelectedId}
          items={items}
        />
      ) : (
        <EmptyState
          actionHref={canConfigure ? "/admin/fields/new" : undefined}
          actionLabel={canConfigure ? "Add first field" : undefined}
          className="mt-8"
          message={canConfigure ? "Add fields to the venue before day-of status and schedule context can appear here." : "No fields are assigned to your venue yet. Ask a venue director to configure them."}
          title="No fields configured"
        />
      )}
    </PageShell>
  );
}
