import {
  getIdentityAccessRequests,
  getIdentityApprovals,
  getIdentityInvites,
  getIdentityRoleAssignments,
  getIdentityRoles,
  getIdentityUsers,
  getOrganizationMemberships,
} from "@/lib/services/identity";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "No limit";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function scopeLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function IdentityPage() {
  const [roles, users, memberships, assignments, invites, accessRequests, approvals] = await Promise.all([
    getIdentityRoles().catch((error: unknown) => {
      console.error("Failed to load GameDay Identity roles", error);
      return [];
    }),
    getIdentityUsers().catch((error: unknown) => {
      console.error("Failed to load GameDay Identity users", error);
      return [];
    }),
    getOrganizationMemberships().catch((error: unknown) => {
      console.error("Failed to load GameDay Identity memberships", error);
      return [];
    }),
    getIdentityRoleAssignments().catch((error: unknown) => {
      console.error("Failed to load GameDay Identity assignments", error);
      return [];
    }),
    getIdentityInvites().catch((error: unknown) => {
      console.error("Failed to load GameDay Identity invites", error);
      return [];
    }),
    getIdentityAccessRequests().catch((error: unknown) => {
      console.error("Failed to load GameDay Identity access requests", error);
      return [];
    }),
    getIdentityApprovals().catch((error: unknown) => {
      console.error("Failed to load GameDay Identity approvals", error);
      return [];
    }),
  ]);

  const assignedUserIds = [...new Set(assignments.map((assignment) => assignment.userId))];
  const activeAssignments = assignments.filter((assignment) => !assignment.endsAt || new Date(assignment.endsAt) > new Date());
  const pendingInvites = invites.filter((invite) => invite.inviteStatus === "pending");
  const pendingAccessRequests = accessRequests.filter((request) => request.requestStatus === "pending");

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">GameDay Identity</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Scoped access foundation</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Identity is organized into Core, Enforcement, and Operations. Mutations require trusted server-side actor context; this page is
            read-only until Supabase Auth, SSO, or API actor resolution is connected.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Users" value={users.length} />
          <MetricCard label="Roles" value={roles.length} />
          <MetricCard label="Active Grants" value={activeAssignments.length} />
          <MetricCard label="Pending Ops" value={pendingInvites.length + pendingAccessRequests.length} />
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <LayerHeader
          label="Layer 1"
          note="Users, organizations, memberships, roles, permissions, and scoped assignments."
          title="Identity Core"
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <SummaryPanel label="Users" value={`${users.length} identity users`} />
          <SummaryPanel label="Memberships" value={`${memberships.length} organization memberships`} />
          <SummaryPanel label="Assignments" value={`${assignments.length} scoped assignments across ${assignedUserIds.length} users`} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <RecordList
            empty="No identity users yet."
            items={users.slice(0, 6).map((user) => ({
              id: user.id,
              meta: `${user.email ?? "No email"} · ${user.userStatus}`,
              title: user.displayName ?? user.email ?? user.id,
            }))}
            title="Users"
          />
          <RecordList
            empty="No organization memberships yet."
            items={memberships.slice(0, 6).map((membership) => ({
              id: membership.id,
              meta: `${membership.userId} · ${membership.membershipStatus}`,
              title: membership.organizationId,
            }))}
            title="Organization memberships"
          />
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <LayerHeader
          label="Layer 2"
          note="Server-side checks call canUser() and requirePermission(); successful sensitive mutations write audit logs."
          title="Enforcement"
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <SummaryPanel label="Permission checks" value="Scoped by type and id" />
          <SummaryPanel label="RLS posture" value="Enabled, no broad public identity policies" />
          <SummaryPanel label="Audit trail" value="Required after sensitive mutations" />
        </div>
        <div className="mt-5 grid gap-3">
          {assignments.length > 0 ? assignments.slice(0, 8).map((assignment) => (
            <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={assignment.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-black">{assignment.roleName}</h3>
                  <p className="mt-1 break-all text-sm font-semibold text-[var(--muted)]">{assignment.userId}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                      {scopeLabel(assignment.scopeType)}
                    </span>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[var(--muted)]">{assignment.scopeId}</span>
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-[var(--muted)] lg:text-right">
                  <p><span className="font-black text-[var(--foreground)]">Starts:</span> {formatDateTime(assignment.startsAt)}</p>
                  <p><span className="font-black text-[var(--foreground)]">Ends:</span> {formatDateTime(assignment.endsAt)}</p>
                  <p><span className="font-black text-[var(--foreground)]">Granted by:</span> {assignment.grantedBy ?? "Not recorded"}</p>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-lg bg-[var(--background)] p-5">
              <h3 className="text-lg font-black">No scoped role assignments yet</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Assignments should be created only by trusted server-side actor flows.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <LayerHeader
          label="Layer 3"
          note="Invites, temporary access, role management UI, and approval workflows sit above Core and Enforcement."
          title="Operations"
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <SummaryPanel label="Pending invites" value={`${pendingInvites.length} waiting`} />
          <SummaryPanel label="Access requests" value={`${pendingAccessRequests.length} pending review`} />
          <SummaryPanel label="Approvals" value={`${approvals.length} tracked decisions`} />
          <SummaryPanel label="Temporary grants" value={`${assignments.filter((assignment) => assignment.endsAt).length} with end dates`} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <RecordList
            empty="No identity invites yet."
            items={invites.slice(0, 6).map((invite) => ({
              id: invite.id,
              meta: `${invite.roleName} · ${scopeLabel(invite.scopeType)} · ${invite.inviteStatus}`,
              title: invite.email,
            }))}
            title="Invites"
          />
          <RecordList
            empty="No access requests yet."
            items={accessRequests.slice(0, 6).map((request) => ({
              id: request.id,
              meta: `${request.requestedRoleName ?? "No role selected"} · ${scopeLabel(request.scopeType)} · ${request.requestStatus}`,
              title: request.email ?? request.userId ?? "Unknown requester",
            }))}
            title="Access requests"
          />
        </div>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function LayerHeader({ label, note, title }: { label: string; note: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">{label}</p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
    </div>
  );
}

function SummaryPanel({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg bg-[var(--background)] p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </article>
  );
}

function RecordList({ empty, items, title }: { empty: string; items: Array<{ id: string; meta: string; title: string }>; title: string }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-4">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? items.map((item) => (
          <div className="rounded-lg bg-white p-3" key={item.id}>
            <p className="break-all font-black">{item.title}</p>
            <p className="mt-1 break-all text-xs font-semibold text-[var(--muted)]">{item.meta}</p>
          </div>
        )) : (
          <p className="rounded-lg bg-white p-3 text-sm font-semibold text-[var(--muted)]">{empty}</p>
        )}
      </div>
    </div>
  );
}
