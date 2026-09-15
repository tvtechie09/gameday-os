-- One persisted launch gate per venue. These records are operational evidence,
-- not public content, so only trusted server-side clients receive privileges.
create table if not exists public.pilot_launches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid not null unique references public.venues(id) on delete cascade,
  status text not null default 'setup' check (status in ('setup', 'rehearsal', 'approved', 'live', 'paused')),
  target_launch_date date,
  primary_owner_name text not null default '',
  primary_owner_contact text not null default '',
  backup_owner_name text not null default '',
  backup_owner_contact text not null default '',
  escalation_contact text not null default '',
  support_notes text not null default '',
  go_no_go_notes text not null default '',
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_rehearsal_checks (
  id uuid primary key default gen_random_uuid(),
  pilot_launch_id uuid not null references public.pilot_launches(id) on delete cascade,
  check_key text not null,
  status text not null default 'pending' check (status in ('pending', 'passed', 'failed', 'blocked')),
  notes text not null default '',
  completed_by uuid references public.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pilot_launch_id, check_key)
);

create table if not exists public.pilot_support_incidents (
  id uuid primary key default gen_random_uuid(),
  pilot_launch_id uuid not null references public.pilot_launches(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  summary text not null,
  owner_name text not null default '',
  requires_developer boolean not null default false,
  resolution_notes text not null default '',
  reported_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pilot_rehearsal_checks_launch_idx
  on public.pilot_rehearsal_checks(pilot_launch_id, status);

create index if not exists pilot_support_incidents_venue_idx
  on public.pilot_support_incidents(venue_id, status, created_at desc);

alter table public.pilot_launches enable row level security;
alter table public.pilot_rehearsal_checks enable row level security;
alter table public.pilot_support_incidents enable row level security;

revoke all on table public.pilot_launches from public, anon, authenticated;
revoke all on table public.pilot_rehearsal_checks from public, anon, authenticated;
revoke all on table public.pilot_support_incidents from public, anon, authenticated;

grant select, insert, update on table public.pilot_launches to service_role;
grant select, insert, update on table public.pilot_rehearsal_checks to service_role;
grant select, insert, update on table public.pilot_support_incidents to service_role;
