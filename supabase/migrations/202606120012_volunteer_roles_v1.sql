create table if not exists public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  role_type text not null check (role_type in ('scorekeeper', 'stream_operator', 'audio_operator', 'announcer', 'scoreboard_operator', 'field_admin', 'other')),
  display_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'active', 'ended', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists volunteer_roles_venue_id_idx on public.volunteer_roles(venue_id);
create index if not exists volunteer_roles_field_id_idx on public.volunteer_roles(field_id);
create index if not exists volunteer_roles_session_id_idx on public.volunteer_roles(session_id);
create index if not exists volunteer_roles_status_idx on public.volunteer_roles(status);

alter table public.volunteer_roles enable row level security;

drop policy if exists "Public can read volunteer roles" on public.volunteer_roles;
create policy "Public can read volunteer roles"
  on public.volunteer_roles for select
  using (true);
