create table if not exists public.weather_profiles (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  location_name text not null,
  latitude double precision,
  longitude double precision,
  weather_source text not null default 'manual' check (weather_source in ('manual', 'national_weather_service', 'weatherkit', 'other')),
  status text not null default 'not_configured' check (status in ('not_configured', 'configured', 'monitoring', 'paused', 'offline')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weather_profiles_venue_id_idx on public.weather_profiles(venue_id);
create index if not exists weather_profiles_status_idx on public.weather_profiles(status);
create index if not exists weather_profiles_source_idx on public.weather_profiles(weather_source);

alter table public.weather_profiles enable row level security;

drop policy if exists "Public can read weather profiles" on public.weather_profiles;
create policy "Public can read weather profiles"
  on public.weather_profiles for select
  using (true);

drop policy if exists "Public can create weather profiles" on public.weather_profiles;
create policy "Public can create weather profiles"
  on public.weather_profiles for insert
  with check (true);

drop policy if exists "Public can update weather profiles" on public.weather_profiles;
create policy "Public can update weather profiles"
  on public.weather_profiles for update
  using (true)
  with check (true);
