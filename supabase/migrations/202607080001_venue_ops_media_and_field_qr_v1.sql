-- Venue Operations: field QR routing + media/amenity/maintenance tables v1
-- Additive migration. Extends the existing parent-field / play-surface hierarchy
-- (see 202606250001_venue_complex_foundation_v1.sql) with public QR routing
-- metadata on fields and adds operational tables for cameras, audio systems,
-- amenities, and maintenance records. Preserves all existing data.

create extension if not exists pgcrypto;

-- 1. Field QR routing + youth-surface descriptors -----------------------------
alter table public.fields add column if not exists layout_type text;
alter table public.fields add column if not exists age_group text;
alter table public.fields add column if not exists qr_code_url text;
alter table public.fields add column if not exists qr_code_slug text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fields_layout_type_check') then
    alter table public.fields
      add constraint fields_layout_type_check
      check (layout_type is null or layout_type in ('Full', 'Split', 'Tournament', 'Practice'));
  end if;
end $$;

create unique index if not exists fields_qr_code_slug_key
  on public.fields(qr_code_slug)
  where qr_code_slug is not null;

-- 2. Cameras ------------------------------------------------------------------
create table if not exists public.cameras (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  name text not null,
  camera_type text not null default 'fixed' check (camera_type in ('fixed', 'PTZ')),
  location_description text,
  stream_status text not null default 'offline' check (stream_status in ('online', 'offline', 'degraded')),
  manufacturer text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Audio systems ------------------------------------------------------------
create table if not exists public.audio_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  name text not null,
  system_type text not null default 'PA' check (system_type in ('PA', 'wireless_mic', 'press_box')),
  manufacturer text,
  model text,
  status text not null default 'not_configured' check (status in ('not_configured', 'configured', 'active', 'offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Amenities ----------------------------------------------------------------
create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  name text not null,
  amenity_type text not null check (amenity_type in ('concession', 'playground', 'batting_cage', 'parking', 'rest_area', 'welcome_center', 'beer_garden', 'other')),
  description text,
  map_x numeric check (map_x between 0 and 100),
  map_y numeric check (map_y between 0 and 100),
  status text not null default 'open' check (status in ('open', 'closed', 'seasonal', 'maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Maintenance records ------------------------------------------------------
create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  maintenance_type text not null check (maintenance_type in ('mowing', 'turf_infill', 'drainage_check', 'lining', 'inspection', 'other')),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date date,
  completed_date date,
  performed_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Indexes ------------------------------------------------------------------
create index if not exists cameras_venue_id_idx on public.cameras(venue_id);
create index if not exists cameras_field_id_idx on public.cameras(field_id);
create index if not exists cameras_organization_id_idx on public.cameras(organization_id);
create index if not exists audio_systems_venue_id_idx on public.audio_systems(venue_id);
create index if not exists audio_systems_field_id_idx on public.audio_systems(field_id);
create index if not exists audio_systems_organization_id_idx on public.audio_systems(organization_id);
create index if not exists amenities_venue_id_idx on public.amenities(venue_id);
create index if not exists amenities_sponsor_id_idx on public.amenities(sponsor_id);
create index if not exists amenities_organization_id_idx on public.amenities(organization_id);
create index if not exists maintenance_records_venue_id_idx on public.maintenance_records(venue_id);
create index if not exists maintenance_records_field_id_idx on public.maintenance_records(field_id);
create index if not exists maintenance_records_status_idx on public.maintenance_records(status);

-- 7. Row level security -------------------------------------------------------
-- Mirrors the operational-table pattern used by public.scoreboard_profiles:
-- public read plus permissive insert/update so the app's anon-key server client
-- can manage these rows. The service role bypasses RLS for seeding.
alter table public.cameras enable row level security;
alter table public.audio_systems enable row level security;
alter table public.amenities enable row level security;
alter table public.maintenance_records enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cameras' and policyname = 'Public can read cameras') then
    create policy "Public can read cameras" on public.cameras for select using (true);
    create policy "Public can create cameras" on public.cameras for insert with check (true);
    create policy "Public can update cameras" on public.cameras for update using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_systems' and policyname = 'Public can read audio systems') then
    create policy "Public can read audio systems" on public.audio_systems for select using (true);
    create policy "Public can create audio systems" on public.audio_systems for insert with check (true);
    create policy "Public can update audio systems" on public.audio_systems for update using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'amenities' and policyname = 'Public can read amenities') then
    create policy "Public can read amenities" on public.amenities for select using (true);
    create policy "Public can create amenities" on public.amenities for insert with check (true);
    create policy "Public can update amenities" on public.amenities for update using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'maintenance_records' and policyname = 'Public can read maintenance records') then
    create policy "Public can read maintenance records" on public.maintenance_records for select using (true);
    create policy "Public can create maintenance records" on public.maintenance_records for insert with check (true);
    create policy "Public can update maintenance records" on public.maintenance_records for update using (true) with check (true);
  end if;
end $$;
