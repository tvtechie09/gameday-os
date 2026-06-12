create extension if not exists pgcrypto;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  city text,
  state text,
  address text,
  parking_note text,
  status text not null default 'Draft' check (status in ('Draft', 'Live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  sport_type text not null,
  surface text,
  status text not null default 'Ready' check (status in ('Ready', 'Maintenance', 'Weather hold')),
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  title text not null,
  home_team text not null,
  away_team text not null,
  start_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'final')),
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  inning integer not null default 1 check (inning >= 1),
  inning_half text not null default 'top' check (inning_half in ('top', 'bottom')),
  balls integer not null default 0 check (balls between 0 and 3),
  strikes integer not null default 0 check (strikes between 0 and 2),
  outs integer not null default 0 check (outs between 0 and 2),
  game_status text not null default 'scheduled' check (game_status in ('scheduled', 'active', 'final')),
  primary_link_label text check (primary_link_label in ('GameChanger', 'SidelineHD', 'YouTube', 'SportsEngine', 'TeamSnap', 'Other')),
  primary_link_url text,
  secondary_link_label text check (secondary_link_label in ('GameChanger', 'SidelineHD', 'YouTube', 'SportsEngine', 'TeamSnap', 'Other')),
  secondary_link_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsor_assignments (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  assignment_type text not null check (assignment_type in ('venue', 'field', 'session')),
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  placement_label text not null check (placement_label in ('Presented By', 'Field Sponsor', 'Game Sponsor', 'Featured Sponsor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_assignments_target_check check (
    (assignment_type = 'venue' and venue_id is not null and field_id is null and session_id is null)
    or (assignment_type = 'field' and venue_id is null and field_id is not null and session_id is null)
    or (assignment_type = 'session' and venue_id is null and field_id is null and session_id is not null)
  )
);

create index if not exists fields_venue_id_idx on public.fields(venue_id);
create index if not exists sessions_field_id_idx on public.sessions(field_id);
create index if not exists sponsor_assignments_sponsor_id_idx on public.sponsor_assignments(sponsor_id);
create index if not exists sponsor_assignments_venue_id_idx on public.sponsor_assignments(venue_id);
create index if not exists sponsor_assignments_field_id_idx on public.sponsor_assignments(field_id);
create index if not exists sponsor_assignments_session_id_idx on public.sponsor_assignments(session_id);

alter table public.venues enable row level security;
alter table public.fields enable row level security;
alter table public.sessions enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_assignments enable row level security;

create policy "Public can read venues"
  on public.venues for select
  using (true);

create policy "Public can create venues"
  on public.venues for insert
  with check (true);

create policy "Public can read fields"
  on public.fields for select
  using (true);

create policy "Public can create fields"
  on public.fields for insert
  with check (true);

create policy "Public can read sessions"
  on public.sessions for select
  using (true);

create policy "Public can create sessions"
  on public.sessions for insert
  with check (true);

create policy "Public can read sponsors"
  on public.sponsors for select
  using (true);

create policy "Public can read sponsor assignments"
  on public.sponsor_assignments for select
  using (true);
