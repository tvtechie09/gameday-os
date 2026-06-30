-- GameDay Identity Platform Foundation
-- Shared identity graph for organizations, venues, tournaments/leagues, teams, families, and people.
-- No authentication provider integration is added here.

create extension if not exists pgcrypto;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  email text,
  phone text,
  person_type text not null default 'other',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.people add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.people add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.people add column if not exists display_name text;
alter table public.people add column if not exists email text;
alter table public.people add column if not exists phone text;
alter table public.people add column if not exists person_type text not null default 'other';
alter table public.people add column if not exists notes text;
alter table public.people add column if not exists created_at timestamptz not null default now();
alter table public.people add column if not exists updated_at timestamptz not null default now();

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  primary_contact_person_id uuid references public.people(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.families add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.families add column if not exists name text;
alter table public.families add column if not exists primary_contact_person_id uuid references public.people(id) on delete set null;
alter table public.families add column if not exists notes text;
alter table public.families add column if not exists created_at timestamptz not null default now();
alter table public.families add column if not exists updated_at timestamptz not null default now();

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  relationship text not null default 'other',
  is_primary_guardian boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, person_id)
);

alter table public.family_members add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.family_members add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.family_members add column if not exists person_id uuid references public.people(id) on delete cascade;
alter table public.family_members add column if not exists relationship text not null default 'other';
alter table public.family_members add column if not exists is_primary_guardian boolean not null default false;
alter table public.family_members add column if not exists created_at timestamptz not null default now();

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  league_id uuid,
  name text not null,
  sport_type text not null default 'baseball',
  age_group text,
  season_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.teams add column if not exists venue_id uuid references public.venues(id) on delete set null;
alter table public.teams add column if not exists league_id uuid;
alter table public.teams add column if not exists name text;
alter table public.teams add column if not exists sport_type text not null default 'baseball';
alter table public.teams add column if not exists age_group text;
alter table public.teams add column if not exists season_name text;
alter table public.teams add column if not exists status text not null default 'active';
alter table public.teams add column if not exists created_at timestamptz not null default now();
alter table public.teams add column if not exists updated_at timestamptz not null default now();

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role_type text not null default 'player',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, person_id, role_type)
);

alter table public.team_members add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.team_members add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.team_members add column if not exists person_id uuid references public.people(id) on delete cascade;
alter table public.team_members add column if not exists role_type text not null default 'player';
alter table public.team_members add column if not exists status text not null default 'active';
alter table public.team_members add column if not exists created_at timestamptz not null default now();
alter table public.team_members add column if not exists updated_at timestamptz not null default now();

create table if not exists public.team_session_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  relationship_type text not null default 'participant',
  created_at timestamptz not null default now(),
  unique (team_id, session_id, relationship_type)
);

alter table public.team_session_links add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.team_session_links add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.team_session_links add column if not exists session_id uuid references public.sessions(id) on delete cascade;
alter table public.team_session_links add column if not exists relationship_type text not null default 'participant';
alter table public.team_session_links add column if not exists created_at timestamptz not null default now();

alter table public.role_assignments add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.role_assignments add column if not exists person_id uuid references public.people(id) on delete set null;
alter table public.role_assignments add column if not exists role_id uuid references public.roles(id) on delete set null;
alter table public.role_assignments add column if not exists scope_type text not null default 'organization';
alter table public.role_assignments add column if not exists scope_id uuid;
alter table public.role_assignments add column if not exists starts_at timestamptz;
alter table public.role_assignments add column if not exists ends_at timestamptz;
alter table public.role_assignments add column if not exists assignment_status text not null default 'approved';

alter table public.role_assignments drop constraint if exists role_assignments_role_type_check;
alter table public.role_assignments add constraint role_assignments_role_type_check check (
  role_type in (
    'super_admin',
    'organization_admin',
    'venue_director',
    'venue_staff',
    'tournament_director',
    'league_director',
    'coach',
    'parent',
    'player',
    'scorekeeper',
    'stream_operator',
    'read_only',
    'field_operator',
    'volunteer'
  )
);

do $$
begin
  alter table public.people add constraint people_person_type_check check (person_type in ('player', 'parent', 'guardian', 'coach', 'staff', 'fan', 'other'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.family_members add constraint family_members_relationship_check check (relationship in ('parent', 'guardian', 'player', 'grandparent', 'relative', 'fan', 'other'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.teams add constraint teams_status_check check (status in ('draft', 'active', 'archived'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.teams add constraint teams_sport_type_check check (sport_type in ('baseball', 'softball', 'soccer', 'football', 'lacrosse', 'basketball', 'volleyball', 'other'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.team_members add constraint team_members_role_type_check check (role_type in ('coach', 'assistant_coach', 'team_manager', 'player', 'scorekeeper', 'stream_operator', 'other'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.team_members add constraint team_members_status_check check (status in ('active', 'inactive'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.team_session_links add constraint team_session_links_relationship_type_check check (relationship_type in ('home', 'away', 'participant'));
exception
  when duplicate_object then null;
end $$;

create index if not exists people_organization_id_idx on public.people(organization_id);
create index if not exists people_user_id_idx on public.people(user_id);
create index if not exists people_email_idx on public.people(email);
create index if not exists families_organization_id_idx on public.families(organization_id);
create index if not exists family_members_organization_id_idx on public.family_members(organization_id);
create index if not exists family_members_family_id_idx on public.family_members(family_id);
create index if not exists family_members_person_id_idx on public.family_members(person_id);
create index if not exists teams_organization_id_idx on public.teams(organization_id);
create index if not exists teams_venue_id_idx on public.teams(venue_id);
create index if not exists team_members_organization_id_idx on public.team_members(organization_id);
create index if not exists team_members_team_id_idx on public.team_members(team_id);
create index if not exists team_members_person_id_idx on public.team_members(person_id);
create index if not exists team_session_links_organization_id_idx on public.team_session_links(organization_id);
create index if not exists team_session_links_team_id_idx on public.team_session_links(team_id);
create index if not exists team_session_links_session_id_idx on public.team_session_links(session_id);
create index if not exists role_assignments_scope_idx on public.role_assignments(scope_type, scope_id);
create index if not exists role_assignments_user_id_idx on public.role_assignments(user_id);
create index if not exists role_assignments_person_id_idx on public.role_assignments(person_id);

alter table public.people enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_session_links enable row level security;
alter table public.role_assignments enable row level security;

insert into public.roles (key, name, description)
values
  ('super_admin', 'Super Admin', 'Platform-wide support and administrative access.'),
  ('organization_admin', 'Organization Admin', 'Manages one organization and its owned venues, teams, tournaments, families, and staff.'),
  ('venue_director', 'Venue Director', 'Owns venue operations, fields, alerts, scoreboards, resources, and emergency controls.'),
  ('venue_staff', 'Venue Staff', 'Supports venue operations and game-day workflows.'),
  ('tournament_director', 'Tournament Director', 'Manages tournament schedule, brackets, assignments, and tournament announcements.'),
  ('league_director', 'League Director', 'Manages league schedules and team administration.'),
  ('coach', 'Coach', 'Manages team context and assigned game-level workflows.'),
  ('parent', 'Parent', 'Views and manages approved family/child context.'),
  ('player', 'Player', 'Views player/team context where approved.'),
  ('scorekeeper', 'Scorekeeper', 'Updates score/status for assigned games only.'),
  ('stream_operator', 'Stream Operator', 'Controls approved stream workflows for assigned games only.'),
  ('read_only', 'Read Only', 'Views approved admin context without making changes.')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;
