-- Digital Venue Platform v1
-- Durable venue asset registry. No hardware control and no external APIs.

create table if not exists public.venue_buildings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  description text,
  map_x numeric check (map_x between 0 and 100),
  map_y numeric check (map_y between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venue_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  building_id uuid references public.venue_buildings(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  asset_name text not null,
  asset_type text not null default 'other',
  asset_category text not null default 'miscellaneous',
  manufacturer text,
  model text,
  serial_number text,
  ip_address text,
  physical_location text,
  map_x numeric check (map_x between 0 and 100),
  map_y numeric check (map_y between 0 and 100),
  status text not null default 'unknown',
  integration_status text not null default 'not_configured',
  notes text,
  installation_date date,
  warranty_end date,
  photos jsonb not null default '[]'::jsonb,
  manuals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venue_assets add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.venue_assets add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.venue_assets add column if not exists building_id uuid references public.venue_buildings(id) on delete set null;
alter table public.venue_assets add column if not exists field_id uuid references public.fields(id) on delete set null;
alter table public.venue_assets add column if not exists asset_name text;
alter table public.venue_assets add column if not exists asset_type text not null default 'other';
alter table public.venue_assets add column if not exists asset_category text not null default 'miscellaneous';
alter table public.venue_assets add column if not exists manufacturer text;
alter table public.venue_assets add column if not exists model text;
alter table public.venue_assets add column if not exists serial_number text;
alter table public.venue_assets add column if not exists ip_address text;
alter table public.venue_assets add column if not exists physical_location text;
alter table public.venue_assets add column if not exists map_x numeric check (map_x between 0 and 100);
alter table public.venue_assets add column if not exists map_y numeric check (map_y between 0 and 100);
alter table public.venue_assets add column if not exists status text not null default 'unknown';
alter table public.venue_assets add column if not exists integration_status text not null default 'not_configured';
alter table public.venue_assets add column if not exists notes text;
alter table public.venue_assets add column if not exists installation_date date;
alter table public.venue_assets add column if not exists warranty_end date;
alter table public.venue_assets add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.venue_assets add column if not exists manuals jsonb not null default '[]'::jsonb;
alter table public.venue_assets add column if not exists created_at timestamptz not null default now();
alter table public.venue_assets add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.venue_assets add constraint venue_assets_asset_type_check check (
    asset_type in ('scoreboard', 'display', 'tv', 'speaker', 'audio_zone', 'camera', 'network_equipment', 'lighting', 'parking_sign', 'wifi', 'emergency_device', 'other')
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.venue_assets add constraint venue_assets_asset_category_check check (
    asset_category in ('scoreboards', 'displays', 'audio', 'video', 'networking', 'lighting', 'infrastructure', 'miscellaneous')
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.venue_assets add constraint venue_assets_status_check check (status in ('healthy', 'offline', 'maintenance_needed', 'unknown'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.venue_assets add constraint venue_assets_integration_status_check check (integration_status in ('not_configured', 'configured', 'connected', 'testing'));
exception
  when duplicate_object then null;
end $$;

create index if not exists venue_buildings_organization_id_idx on public.venue_buildings(organization_id);
create index if not exists venue_buildings_venue_id_idx on public.venue_buildings(venue_id);
create index if not exists venue_assets_organization_id_idx on public.venue_assets(organization_id);
create index if not exists venue_assets_venue_id_idx on public.venue_assets(venue_id);
create index if not exists venue_assets_building_id_idx on public.venue_assets(building_id);
create index if not exists venue_assets_field_id_idx on public.venue_assets(field_id);
create index if not exists venue_assets_status_idx on public.venue_assets(status);
create index if not exists venue_assets_integration_status_idx on public.venue_assets(integration_status);
create index if not exists venue_assets_category_idx on public.venue_assets(asset_category);

alter table public.venue_buildings enable row level security;
alter table public.venue_assets enable row level security;
