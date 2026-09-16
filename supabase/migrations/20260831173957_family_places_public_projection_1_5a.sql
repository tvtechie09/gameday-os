-- GameDay Family 1.5A: canonical, parent-safe venue place projection.
-- Venue OS owns these columns and views. Family consumes them with the service
-- role after independently proving that the signed-in family has an event at
-- the venue. No device, network, endpoint, operational-note, or maintenance
-- columns are included in either view.

alter table public.venues
  add column if not exists public_status text not null default 'open',
  add column if not exists public_status_message text,
  add column if not exists public_status_effective_at timestamptz,
  add column if not exists public_status_expires_at timestamptz;

alter table public.fields
  add column if not exists parent_visible boolean not null default true,
  add column if not exists public_description text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text,
  add column if not exists accessibility_notes text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists status_effective_at timestamptz,
  add column if not exists status_expires_at timestamptz;

alter table public.venue_zones
  add column if not exists parent_visible boolean not null default false,
  add column if not exists parent_zone_id uuid references public.venue_zones(id) on delete set null,
  add column if not exists short_label text,
  add column if not exists status text not null default 'open',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text,
  add column if not exists accessibility_notes text,
  add column if not exists operating_hours text,
  add column if not exists status_effective_at timestamptz,
  add column if not exists status_expires_at timestamptz;

alter table public.play_surfaces
  add column if not exists parent_visible boolean not null default false,
  add column if not exists description text,
  add column if not exists short_label text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text,
  add column if not exists accessibility_notes text,
  add column if not exists operating_hours text,
  add column if not exists status_effective_at timestamptz,
  add column if not exists status_expires_at timestamptz;

alter table public.amenities
  add column if not exists parent_visible boolean not null default true,
  add column if not exists zone_id uuid references public.venue_zones(id) on delete set null,
  add column if not exists parent_amenity_id uuid references public.amenities(id) on delete set null,
  add column if not exists short_label text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text,
  add column if not exists accessibility_notes text,
  add column if not exists operating_hours text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists status_effective_at timestamptz,
  add column if not exists status_expires_at timestamptz;

alter table public.venues drop constraint if exists venues_public_status_check;
alter table public.venues add constraint venues_public_status_check
  check (public_status in ('open', 'closed', 'delayed', 'maintenance', 'weather_hold', 'unavailable', 'unknown'));
alter table public.venue_zones drop constraint if exists venue_zones_status_check;
alter table public.venue_zones add constraint venue_zones_status_check
  check (status in ('open', 'active', 'closed', 'delayed', 'maintenance', 'weather_hold', 'unavailable', 'unknown'));
alter table public.amenities drop constraint if exists amenities_amenity_type_check;
alter table public.amenities add constraint amenities_amenity_type_check check (
  amenity_type in (
    'concession', 'playground', 'batting_cage', 'parking', 'rest_area',
    'welcome_center', 'beer_garden', 'restroom', 'entrance', 'exit',
    'first_aid', 'warmup_area', 'information', 'locker_room', 'equipment',
    'stage', 'seating', 'studio', 'room', 'other'
  )
);

create index if not exists fields_family_places_idx
  on public.fields (venue_id, parent_visible, sort_order, name);
create index if not exists venue_zones_family_places_idx
  on public.venue_zones (venue_id, parent_visible, sort_order, name);
create index if not exists venue_zones_parent_zone_id_idx
  on public.venue_zones (parent_zone_id);
create index if not exists play_surfaces_family_places_idx
  on public.play_surfaces (venue_id, parent_visible, sort_order, name);
create index if not exists amenities_family_places_idx
  on public.amenities (venue_id, parent_visible, sort_order, name);
create index if not exists amenities_zone_id_idx on public.amenities (zone_id);
create index if not exists amenities_parent_amenity_id_idx on public.amenities (parent_amenity_id);

create or replace view public.venue_public_summaries
with (security_invoker = true)
as
select
  id,
  name,
  description,
  address,
  city,
  state,
  zip,
  timezone,
  parking_note,
  entrance_note,
  restroom_note,
  concession_note,
  warmup_note,
  general_instructions,
  emergency_information,
  map_image_url,
  latitude,
  longitude,
  public_status,
  public_status_message,
  public_status_effective_at,
  public_status_expires_at,
  updated_at
from public.venues
where status = 'Live';

create or replace view public.venue_public_places
with (security_invoker = true)
as
select
  'field:' || f.id::text as place_key,
  f.id as source_id,
  'field'::text as source_type,
  f.venue_id,
  case when f.parent_field_id is not null then 'field:' || f.parent_field_id::text
       when f.zone_id is not null then 'zone:' || f.zone_id::text end as parent_place_key,
  f.zone_id,
  f.name,
  f.surface_code as short_label,
  coalesce(f.public_description, f.surface) as description,
  coalesce(nullif(f.sport_type, ''), 'field') as place_type,
  coalesce(nullif(f.field_status, ''), nullif(f.status, ''), 'open') as status,
  f.status_effective_at,
  f.status_expires_at,
  f.map_label,
  f.map_x,
  f.map_y,
  f.latitude,
  f.longitude,
  f.address,
  f.accessibility_notes,
  null::text as operating_hours,
  f.sort_order,
  f.id as field_id,
  null::uuid as play_surface_id,
  f.updated_at
from public.fields f
where f.parent_visible

union all

select
  'zone:' || z.id::text,
  z.id,
  'zone'::text,
  z.venue_id,
  case when z.parent_zone_id is not null then 'zone:' || z.parent_zone_id::text end,
  z.id,
  z.name,
  z.short_label,
  z.description,
  z.zone_type,
  z.status,
  z.status_effective_at,
  z.status_expires_at,
  z.map_label,
  z.map_x,
  z.map_y,
  z.latitude,
  z.longitude,
  z.address,
  z.accessibility_notes,
  z.operating_hours,
  z.sort_order,
  null::uuid,
  null::uuid,
  z.updated_at
from public.venue_zones z
where z.parent_visible

union all

select
  'play_surface:' || s.id::text,
  s.id,
  'play_surface'::text,
  s.venue_id,
  case when s.field_id is not null then 'field:' || s.field_id::text
       when s.parent_field_id is not null then 'field:' || s.parent_field_id::text
       when s.zone_id is not null then 'zone:' || s.zone_id::text end,
  s.zone_id,
  s.name,
  coalesce(s.short_label, s.surface_code),
  s.description,
  s.surface_type,
  s.status,
  s.status_effective_at,
  s.status_expires_at,
  s.map_label,
  s.map_x,
  s.map_y,
  s.latitude,
  s.longitude,
  s.address,
  s.accessibility_notes,
  s.operating_hours,
  s.sort_order,
  coalesce(s.field_id, s.parent_field_id),
  s.id,
  s.updated_at
from public.play_surfaces s
where s.parent_visible

union all

select
  'amenity:' || a.id::text,
  a.id,
  'amenity'::text,
  a.venue_id,
  case when a.parent_amenity_id is not null then 'amenity:' || a.parent_amenity_id::text
       when a.zone_id is not null then 'zone:' || a.zone_id::text end,
  a.zone_id,
  a.name,
  a.short_label,
  a.description,
  a.amenity_type,
  a.status,
  a.status_effective_at,
  a.status_expires_at,
  null::text,
  a.map_x,
  a.map_y,
  a.latitude,
  a.longitude,
  a.address,
  a.accessibility_notes,
  a.operating_hours,
  a.sort_order,
  null::uuid,
  null::uuid,
  a.updated_at
from public.amenities a
where a.parent_visible;

revoke all on public.venue_public_summaries from public, anon, authenticated;
revoke all on public.venue_public_places from public, anon, authenticated;
grant select on public.venue_public_summaries to service_role;
grant select on public.venue_public_places to service_role;

comment on view public.venue_public_summaries is
  'Parent-safe live venue projection. Consume only after application-level family-to-event authorization.';
comment on view public.venue_public_places is
  'Parent-visible canonical Venue POIs. Excludes operational, device, endpoint, network, and maintenance data.';
