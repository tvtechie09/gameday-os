create table if not exists public.scoreboard_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete set null,
  manufacturer text not null default 'Manual',
  model text not null default 'GameDay OS',
  connection_type text not null default 'manual',
  integration_mode text not null default 'manual_only',
  scoreboard_status text not null default 'not_configured',
  ip_address text,
  controller_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'scoreboard_profiles_connection_type_check'
  ) then
    alter table public.scoreboard_profiles
      add constraint scoreboard_profiles_connection_type_check
      check (connection_type in ('manual', 'network', 'serial', 'controller_bridge', 'cloud_api', 'obs_overlay', 'unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'scoreboard_profiles_integration_mode_check'
  ) then
    alter table public.scoreboard_profiles
      add constraint scoreboard_profiles_integration_mode_check
      check (integration_mode in ('manual_only', 'read_only', 'write_to_scoreboard', 'write_to_overlay', 'future_hardware'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'scoreboard_profiles_scoreboard_status_check'
  ) then
    alter table public.scoreboard_profiles
      add constraint scoreboard_profiles_scoreboard_status_check
      check (scoreboard_status in ('not_configured', 'configured', 'testing', 'active', 'offline'));
  end if;
end $$;

create index if not exists scoreboard_profiles_organization_id_idx on public.scoreboard_profiles(organization_id);
create index if not exists scoreboard_profiles_venue_id_idx on public.scoreboard_profiles(venue_id);
create index if not exists scoreboard_profiles_field_id_idx on public.scoreboard_profiles(field_id);
create index if not exists scoreboard_profiles_resource_id_idx on public.scoreboard_profiles(resource_id);
create index if not exists scoreboard_profiles_status_idx on public.scoreboard_profiles(scoreboard_status);

alter table public.scoreboard_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'scoreboard_profiles'
      and policyname = 'Public can read scoreboard profiles'
  ) then
    create policy "Public can read scoreboard profiles"
      on public.scoreboard_profiles for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'scoreboard_profiles'
      and policyname = 'Public can create scoreboard profiles'
  ) then
    create policy "Public can create scoreboard profiles"
      on public.scoreboard_profiles for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'scoreboard_profiles'
      and policyname = 'Public can update scoreboard profiles'
  ) then
    create policy "Public can update scoreboard profiles"
      on public.scoreboard_profiles for update
      using (true)
      with check (true);
  end if;
end $$;
