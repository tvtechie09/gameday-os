-- GameDay Venue complex venue foundation v1
-- Adds zones, play surfaces, field layouts, and provider-ready Venue Mode endpoints.
-- This migration is additive and preserves existing venue, field, and session data.

create extension if not exists pgcrypto;

create table if not exists public.venue_zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  description text,
  zone_type text not null default 'field_area',
  map_label text,
  map_x numeric,
  map_y numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_zones_zone_type_check check (
    zone_type in ('field_area', 'building', 'parking', 'entrance', 'concourse', 'support', 'other')
  )
);

create table if not exists public.play_surfaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  zone_id uuid references public.venue_zones(id) on delete set null,
  parent_field_id uuid references public.fields(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  name text not null,
  surface_code text,
  sport_types text[] not null default '{}',
  surface_type text not null default 'field',
  layout_role text not null default 'standalone',
  status text not null default 'open',
  map_label text,
  map_x numeric,
  map_y numeric,
  capacity integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint play_surfaces_surface_type_check check (
    surface_type in ('field', 'court', 'pitch', 'diamond', 'track', 'turf', 'room', 'other')
  ),
  constraint play_surfaces_layout_role_check check (
    layout_role in ('standalone', 'parent', 'split_child', 'overlay', 'temporary')
  ),
  constraint play_surfaces_status_check check (
    status in ('open', 'active', 'delayed', 'closed', 'maintenance')
  )
);

create table if not exists public.field_layouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  parent_field_id uuid references public.fields(id) on delete set null,
  layout_name text not null,
  layout_type text not null default 'split',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_layouts_layout_type_check check (
    layout_type in ('full', 'split', 'overlay', 'temporary')
  )
);

create table if not exists public.field_layout_surfaces (
  layout_id uuid not null references public.field_layouts(id) on delete cascade,
  play_surface_id uuid not null references public.play_surfaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (layout_id, play_surface_id)
);

create table if not exists public.venue_mode_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  endpoint_type text not null,
  provider_key text not null default 'manual',
  endpoint_label text not null,
  endpoint_url text,
  status text not null default 'not_configured',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_mode_endpoints_type_check check (
    endpoint_type in ('qr_entry', 'equipment', 'location_provider', 'display', 'api', 'other')
  ),
  constraint venue_mode_endpoints_provider_check check (
    provider_key in ('manual', 'meraki', 'cisco_spaces', 'future_provider', 'other')
  ),
  constraint venue_mode_endpoints_status_check check (
    status in ('not_configured', 'configured', 'active', 'offline', 'error')
  )
);

alter table public.fields add column if not exists zone_id uuid references public.venue_zones(id) on delete set null;
alter table public.fields add column if not exists parent_field_id uuid references public.fields(id) on delete set null;
alter table public.fields add column if not exists layout_role text not null default 'standalone';
alter table public.fields add column if not exists surface_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fields_layout_role_check'
  ) then
    alter table public.fields
      add constraint fields_layout_role_check
      check (layout_role in ('standalone', 'parent', 'split_child', 'overlay', 'temporary'));
  end if;
end $$;

alter table public.sessions add column if not exists play_surface_id uuid references public.play_surfaces(id) on delete set null;

create index if not exists venue_zones_venue_id_idx on public.venue_zones(venue_id);
create index if not exists venue_zones_organization_id_idx on public.venue_zones(organization_id);
create index if not exists play_surfaces_venue_id_idx on public.play_surfaces(venue_id);
create index if not exists play_surfaces_zone_id_idx on public.play_surfaces(zone_id);
create index if not exists play_surfaces_parent_field_id_idx on public.play_surfaces(parent_field_id);
create index if not exists play_surfaces_field_id_idx on public.play_surfaces(field_id);
create index if not exists field_layouts_venue_id_idx on public.field_layouts(venue_id);
create index if not exists field_layouts_parent_field_id_idx on public.field_layouts(parent_field_id);
create index if not exists venue_mode_endpoints_venue_id_idx on public.venue_mode_endpoints(venue_id);
create index if not exists venue_mode_endpoints_type_idx on public.venue_mode_endpoints(endpoint_type);
create index if not exists fields_zone_id_idx on public.fields(zone_id);
create index if not exists fields_parent_field_id_idx on public.fields(parent_field_id);
create index if not exists sessions_play_surface_id_idx on public.sessions(play_surface_id);

alter table public.venue_zones enable row level security;
alter table public.play_surfaces enable row level security;
alter table public.field_layouts enable row level security;
alter table public.field_layout_surfaces enable row level security;
alter table public.venue_mode_endpoints enable row level security;
