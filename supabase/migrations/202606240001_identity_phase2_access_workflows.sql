-- GameDay Identity Phase 2: Access Workflows
-- Safe catch-up migration for invites, access requests, approvals, and temporary access lifecycle.

create extension if not exists pgcrypto;

alter table public.user_role_assignments add column if not exists assignment_status text not null default 'approved';
alter table public.user_role_assignments add column if not exists revoked_by uuid references public.users(id);
alter table public.user_role_assignments add column if not exists revoked_at timestamptz;
alter table public.user_role_assignments add column if not exists approval_notes text;
create index if not exists user_role_assignments_status_idx on public.user_role_assignments(assignment_status);

create table if not exists public.identity_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  email text not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_type text not null,
  scope_id uuid not null,
  invite_status text not null default 'pending',
  invited_by uuid references public.users(id),
  approved_by uuid references public.users(id),
  expires_at timestamptz,
  approved_at timestamptz,
  revoked_at timestamptz,
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.identity_invites add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.identity_invites add column if not exists email text;
alter table public.identity_invites add column if not exists role_id uuid references public.roles(id) on delete cascade;
alter table public.identity_invites add column if not exists scope_type text;
alter table public.identity_invites add column if not exists scope_id uuid;
alter table public.identity_invites add column if not exists invite_status text not null default 'pending';
alter table public.identity_invites add column if not exists invited_by uuid references public.users(id);
alter table public.identity_invites add column if not exists approved_by uuid references public.users(id);
alter table public.identity_invites add column if not exists expires_at timestamptz;
alter table public.identity_invites add column if not exists approved_at timestamptz;
alter table public.identity_invites add column if not exists revoked_at timestamptz;
alter table public.identity_invites add column if not exists approval_notes text;
alter table public.identity_invites add column if not exists created_at timestamptz not null default now();
alter table public.identity_invites add column if not exists updated_at timestamptz not null default now();

update public.identity_invites set invite_status = 'approved' where invite_status = 'accepted';
update public.identity_invites set invite_status = 'denied' where invite_status in ('rejected', 'cancelled');

create table if not exists public.identity_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  email text,
  requested_role_id uuid references public.roles(id),
  requested_by uuid references public.users(id),
  scope_type text not null,
  scope_id uuid not null,
  request_status text not null default 'pending',
  reason text,
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  revoked_by uuid references public.users(id),
  revoked_at timestamptz,
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.identity_access_requests add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.identity_access_requests add column if not exists email text;
alter table public.identity_access_requests add column if not exists requested_role_id uuid references public.roles(id);
alter table public.identity_access_requests add column if not exists requested_by uuid references public.users(id);
alter table public.identity_access_requests add column if not exists scope_type text;
alter table public.identity_access_requests add column if not exists scope_id uuid;
alter table public.identity_access_requests add column if not exists request_status text not null default 'pending';
alter table public.identity_access_requests add column if not exists reason text;
alter table public.identity_access_requests add column if not exists approved_by uuid references public.users(id);
alter table public.identity_access_requests add column if not exists approved_at timestamptz;
alter table public.identity_access_requests add column if not exists revoked_by uuid references public.users(id);
alter table public.identity_access_requests add column if not exists revoked_at timestamptz;
alter table public.identity_access_requests add column if not exists approval_notes text;
alter table public.identity_access_requests add column if not exists created_at timestamptz not null default now();
alter table public.identity_access_requests add column if not exists updated_at timestamptz not null default now();

update public.identity_access_requests set request_status = 'denied' where request_status in ('rejected', 'cancelled');

create table if not exists public.identity_approvals (
  id uuid primary key default gen_random_uuid(),
  approval_status text not null default 'pending',
  approval_type text not null,
  invite_id uuid references public.identity_invites(id) on delete cascade,
  access_request_id uuid references public.identity_access_requests(id) on delete cascade,
  assignment_id uuid references public.user_role_assignments(id) on delete set null,
  scope_type text not null,
  scope_id uuid not null,
  requested_by uuid references public.users(id),
  approved_by uuid references public.users(id),
  revoked_by uuid references public.users(id),
  reason text,
  approval_notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists identity_invites_email_idx on public.identity_invites(email);
create index if not exists identity_invites_scope_idx on public.identity_invites(scope_type, scope_id);
create index if not exists identity_invites_status_idx on public.identity_invites(invite_status);
create index if not exists identity_access_requests_user_id_idx on public.identity_access_requests(user_id);
create index if not exists identity_access_requests_requested_by_idx on public.identity_access_requests(requested_by);
create index if not exists identity_access_requests_scope_idx on public.identity_access_requests(scope_type, scope_id);
create index if not exists identity_access_requests_status_idx on public.identity_access_requests(request_status);
create index if not exists identity_approvals_status_idx on public.identity_approvals(approval_status);
create index if not exists identity_approvals_scope_idx on public.identity_approvals(scope_type, scope_id);
create index if not exists identity_approvals_invite_id_idx on public.identity_approvals(invite_id);
create index if not exists identity_approvals_access_request_id_idx on public.identity_approvals(access_request_id);
create index if not exists identity_approvals_assignment_id_idx on public.identity_approvals(assignment_id);

alter table public.identity_invites enable row level security;
alter table public.identity_access_requests enable row level security;
alter table public.identity_approvals enable row level security;
