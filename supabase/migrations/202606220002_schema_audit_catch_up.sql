-- GameDay OS schema audit catch-up migration.
-- Purpose: safely create missing tables and add missing columns reported by Schema Audit.
-- This migration is intentionally additive and data-preserving.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  banner_url text,
  primary_color text,
  secondary_color text,
  website_url text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  role_type text not null default 'read_only',
  display_name text not null default 'Unassigned',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  description text,
  city text,
  state text,
  address text,
  parking_note text,
  status text not null default 'Draft',
  logo_url text,
  banner_url text,
  map_image_url text,
  map_notes text,
  primary_color text,
  secondary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete cascade,
  name text not null,
  sport_type text not null default 'baseball',
  map_label text,
  map_x numeric,
  map_y numeric,
  surface text,
  status text not null default 'open',
  field_status text not null default 'open',
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  resource_name text not null default 'Resource',
  resource_type text not null default 'other',
  manufacturer text,
  model text,
  serial_number text,
  status text not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  field_id uuid references public.fields(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  title text not null,
  sport_type text not null default 'baseball',
  home_team text not null default 'Home',
  away_team text not null default 'Away',
  start_time timestamptz not null default now(),
  end_time timestamptz,
  status text not null default 'scheduled',
  home_score integer not null default 0,
  away_score integer not null default 0,
  is_demo boolean not null default false,
  inning integer not null default 1,
  inning_half text not null default 'top',
  balls integer not null default 0,
  strikes integer not null default 0,
  outs integer not null default 0,
  game_status text not null default 'scheduled',
  primary_link_label text,
  primary_link_url text,
  secondary_link_label text,
  secondary_link_url text,
  external_source text,
  external_source_id text,
  external_source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scoreboard_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
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

create table if not exists public.scoreboard_adapters (
  id uuid primary key default gen_random_uuid(),
  scoreboard_id uuid references public.scoreboard_profiles(id) on delete cascade,
  adapter_type text not null default 'manual',
  adapter_status text not null default 'inactive',
  last_sync_at timestamptz,
  notes text
);

create table if not exists public.audio_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  audio_mode text not null default 'none',
  speaker_type text,
  provider text,
  status text not null default 'not_configured',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weather_profiles (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  location_name text not null default 'Venue',
  latitude double precision,
  longitude double precision,
  weather_source text not null default 'manual',
  status text not null default 'not_configured',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_activations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references public.resources(id) on delete set null,
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  activation_type text not null default 'other',
  display_name text not null default 'Community Link',
  contact_name text,
  contact_email text,
  resource_url text,
  status text not null default 'requested',
  notes text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '4 hours'),
  assigned_to_session boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  role_type text not null default 'other',
  display_name text not null default 'Volunteer',
  contact_name text,
  contact_email text,
  contact_phone text,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  event_type text not null,
  event_message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  title text not null,
  message text not null,
  venue_id uuid references public.venues(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.external_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete cascade,
  source_type text not null default 'other',
  source_name text not null default 'External Source',
  source_url text,
  source_status text not null default 'not_configured',
  last_sync_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.external_sources(id) on delete set null,
  source_type text not null default 'other',
  status text not null default 'pending',
  records_found integer not null default 0,
  records_imported integer not null default 0,
  records_skipped integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid references public.sync_jobs(id) on delete cascade,
  source_record_id text not null default '',
  source_data jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  logo_url text,
  website_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsor_assignments (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.sponsors(id) on delete cascade,
  assignment_type text not null default 'field',
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  placement_label text not null default 'Featured Sponsor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsor_impressions (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.sponsors(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  viewed_at timestamptz not null default now(),
  page_type text not null default 'field_page'
);

create table if not exists public.sponsor_clicks (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.sponsors(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  clicked_at timestamptz not null default now(),
  page_type text not null default 'field_page'
);

create table if not exists public.field_page_views (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  viewed_at timestamptz not null default now(),
  page_type text not null default 'field_page',
  user_agent text
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  follow_type text not null default 'field',
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null,
  message text not null,
  alert_type text not null default 'info',
  alert_scope text not null default 'venue',
  alert_priority text not null default 'normal',
  alert_visibility text not null default 'public',
  venue_id uuid references public.venues(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  start_time timestamptz not null default now(),
  end_time timestamptz not null default (now() + interval '4 hours'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns to partially-created tables. Required app columns that may
-- be impossible to backfill safely are added nullable when no safe default exists.
alter table public.organizations add column if not exists id uuid default gen_random_uuid();
alter table public.organizations add column if not exists name text;
alter table public.organizations add column if not exists slug text;
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists banner_url text;
alter table public.organizations add column if not exists primary_color text;
alter table public.organizations add column if not exists secondary_color text;
alter table public.organizations add column if not exists website_url text;
alter table public.organizations add column if not exists description text;
alter table public.organizations add column if not exists created_at timestamptz not null default now();

alter table public.role_assignments add column if not exists id uuid default gen_random_uuid();
alter table public.role_assignments add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.role_assignments add column if not exists role_type text not null default 'read_only';
alter table public.role_assignments add column if not exists display_name text not null default 'Unassigned';
alter table public.role_assignments add column if not exists email text not null default '';
alter table public.role_assignments add column if not exists created_at timestamptz not null default now();

alter table public.venues add column if not exists id uuid default gen_random_uuid();
alter table public.venues add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.venues add column if not exists name text;
alter table public.venues add column if not exists description text;
alter table public.venues add column if not exists city text;
alter table public.venues add column if not exists state text;
alter table public.venues add column if not exists address text;
alter table public.venues add column if not exists parking_note text;
alter table public.venues add column if not exists status text not null default 'Draft';
alter table public.venues add column if not exists logo_url text;
alter table public.venues add column if not exists banner_url text;
alter table public.venues add column if not exists map_image_url text;
alter table public.venues add column if not exists map_notes text;
alter table public.venues add column if not exists primary_color text;
alter table public.venues add column if not exists secondary_color text;
alter table public.venues add column if not exists created_at timestamptz not null default now();
alter table public.venues add column if not exists updated_at timestamptz not null default now();

alter table public.fields add column if not exists id uuid default gen_random_uuid();
alter table public.fields add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.fields add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.fields add column if not exists name text;
alter table public.fields add column if not exists sport_type text not null default 'baseball';
alter table public.fields add column if not exists map_label text;
alter table public.fields add column if not exists map_x numeric;
alter table public.fields add column if not exists map_y numeric;
alter table public.fields add column if not exists surface text;
alter table public.fields add column if not exists status text not null default 'open';
alter table public.fields add column if not exists field_status text not null default 'open';
alter table public.fields add column if not exists resources jsonb not null default '[]'::jsonb;
alter table public.fields add column if not exists created_at timestamptz not null default now();
alter table public.fields add column if not exists updated_at timestamptz not null default now();

alter table public.resources add column if not exists id uuid default gen_random_uuid();
alter table public.resources add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.resources add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.resources add column if not exists field_id uuid references public.fields(id) on delete set null;
alter table public.resources add column if not exists resource_name text not null default 'Resource';
alter table public.resources add column if not exists resource_type text not null default 'other';
alter table public.resources add column if not exists manufacturer text;
alter table public.resources add column if not exists model text;
alter table public.resources add column if not exists serial_number text;
alter table public.resources add column if not exists status text not null default 'unknown';
alter table public.resources add column if not exists notes text;
alter table public.resources add column if not exists created_at timestamptz not null default now();
alter table public.resources add column if not exists updated_at timestamptz not null default now();

alter table public.tournaments add column if not exists id uuid default gen_random_uuid();
alter table public.tournaments add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.tournaments add column if not exists name text;
alter table public.tournaments add column if not exists description text;
alter table public.tournaments add column if not exists start_date date;
alter table public.tournaments add column if not exists end_date date;
alter table public.tournaments add column if not exists logo_url text;
alter table public.tournaments add column if not exists website_url text;
alter table public.tournaments add column if not exists created_at timestamptz not null default now();
alter table public.tournaments add column if not exists updated_at timestamptz not null default now();

alter table public.sessions add column if not exists id uuid default gen_random_uuid();
alter table public.sessions add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.sessions add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.sessions add column if not exists tournament_id uuid references public.tournaments(id) on delete set null;
alter table public.sessions add column if not exists title text;
alter table public.sessions add column if not exists sport_type text not null default 'baseball';
alter table public.sessions add column if not exists home_team text not null default 'Home';
alter table public.sessions add column if not exists away_team text not null default 'Away';
alter table public.sessions add column if not exists start_time timestamptz not null default now();
alter table public.sessions add column if not exists end_time timestamptz;
alter table public.sessions add column if not exists status text not null default 'scheduled';
alter table public.sessions add column if not exists home_score integer not null default 0;
alter table public.sessions add column if not exists away_score integer not null default 0;
alter table public.sessions add column if not exists is_demo boolean not null default false;
alter table public.sessions add column if not exists inning integer not null default 1;
alter table public.sessions add column if not exists inning_half text not null default 'top';
alter table public.sessions add column if not exists balls integer not null default 0;
alter table public.sessions add column if not exists strikes integer not null default 0;
alter table public.sessions add column if not exists outs integer not null default 0;
alter table public.sessions add column if not exists game_status text not null default 'scheduled';
alter table public.sessions add column if not exists primary_link_label text;
alter table public.sessions add column if not exists primary_link_url text;
alter table public.sessions add column if not exists secondary_link_label text;
alter table public.sessions add column if not exists secondary_link_url text;
alter table public.sessions add column if not exists external_source text;
alter table public.sessions add column if not exists external_source_id text;
alter table public.sessions add column if not exists external_source_url text;
alter table public.sessions add column if not exists notes text;
alter table public.sessions add column if not exists created_at timestamptz not null default now();
alter table public.sessions add column if not exists updated_at timestamptz not null default now();

alter table public.scoreboard_profiles add column if not exists id uuid default gen_random_uuid();
alter table public.scoreboard_profiles add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.scoreboard_profiles add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.scoreboard_profiles add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.scoreboard_profiles add column if not exists resource_id uuid references public.resources(id) on delete set null;
alter table public.scoreboard_profiles add column if not exists manufacturer text not null default 'Manual';
alter table public.scoreboard_profiles add column if not exists model text not null default 'GameDay OS';
alter table public.scoreboard_profiles add column if not exists connection_type text not null default 'manual';
alter table public.scoreboard_profiles add column if not exists integration_mode text not null default 'manual_only';
alter table public.scoreboard_profiles add column if not exists scoreboard_status text not null default 'not_configured';
alter table public.scoreboard_profiles add column if not exists ip_address text;
alter table public.scoreboard_profiles add column if not exists controller_location text;
alter table public.scoreboard_profiles add column if not exists notes text;
alter table public.scoreboard_profiles add column if not exists created_at timestamptz not null default now();
alter table public.scoreboard_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.scoreboard_adapters add column if not exists id uuid default gen_random_uuid();
alter table public.scoreboard_adapters add column if not exists scoreboard_id uuid references public.scoreboard_profiles(id) on delete cascade;
alter table public.scoreboard_adapters add column if not exists adapter_type text not null default 'manual';
alter table public.scoreboard_adapters add column if not exists adapter_status text not null default 'inactive';
alter table public.scoreboard_adapters add column if not exists last_sync_at timestamptz;
alter table public.scoreboard_adapters add column if not exists notes text;

alter table public.audio_profiles add column if not exists id uuid default gen_random_uuid();
alter table public.audio_profiles add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.audio_profiles add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.audio_profiles add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.audio_profiles add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.audio_profiles add column if not exists audio_mode text not null default 'none';
alter table public.audio_profiles add column if not exists speaker_type text;
alter table public.audio_profiles add column if not exists provider text;
alter table public.audio_profiles add column if not exists status text not null default 'not_configured';
alter table public.audio_profiles add column if not exists notes text;
alter table public.audio_profiles add column if not exists created_at timestamptz not null default now();
alter table public.audio_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.weather_profiles add column if not exists id uuid default gen_random_uuid();
alter table public.weather_profiles add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.weather_profiles add column if not exists location_name text not null default 'Venue';
alter table public.weather_profiles add column if not exists latitude double precision;
alter table public.weather_profiles add column if not exists longitude double precision;
alter table public.weather_profiles add column if not exists weather_source text not null default 'manual';
alter table public.weather_profiles add column if not exists status text not null default 'not_configured';
alter table public.weather_profiles add column if not exists notes text;
alter table public.weather_profiles add column if not exists created_at timestamptz not null default now();
alter table public.weather_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.resource_activations add column if not exists id uuid default gen_random_uuid();
alter table public.resource_activations add column if not exists resource_id uuid references public.resources(id) on delete set null;
alter table public.resource_activations add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.resource_activations add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.resource_activations add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.resource_activations add column if not exists activation_type text not null default 'other';
alter table public.resource_activations add column if not exists display_name text not null default 'Community Link';
alter table public.resource_activations add column if not exists contact_name text;
alter table public.resource_activations add column if not exists contact_email text;
alter table public.resource_activations add column if not exists resource_url text;
alter table public.resource_activations add column if not exists status text not null default 'requested';
alter table public.resource_activations add column if not exists notes text;
alter table public.resource_activations add column if not exists starts_at timestamptz not null default now();
alter table public.resource_activations add column if not exists ends_at timestamptz not null default (now() + interval '4 hours');
alter table public.resource_activations add column if not exists assigned_to_session boolean not null default false;
alter table public.resource_activations add column if not exists approved_by text;
alter table public.resource_activations add column if not exists approved_at timestamptz;
alter table public.resource_activations add column if not exists created_at timestamptz not null default now();
alter table public.resource_activations add column if not exists updated_at timestamptz not null default now();

alter table public.volunteer_roles add column if not exists id uuid default gen_random_uuid();
alter table public.volunteer_roles add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.volunteer_roles add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.volunteer_roles add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.volunteer_roles add column if not exists role_type text not null default 'other';
alter table public.volunteer_roles add column if not exists display_name text not null default 'Volunteer';
alter table public.volunteer_roles add column if not exists contact_name text;
alter table public.volunteer_roles add column if not exists contact_email text;
alter table public.volunteer_roles add column if not exists contact_phone text;
alter table public.volunteer_roles add column if not exists status text not null default 'requested';
alter table public.volunteer_roles add column if not exists notes text;
alter table public.volunteer_roles add column if not exists created_at timestamptz not null default now();
alter table public.volunteer_roles add column if not exists updated_at timestamptz not null default now();

alter table public.session_events add column if not exists id uuid default gen_random_uuid();
alter table public.session_events add column if not exists session_id uuid references public.sessions(id) on delete cascade;
alter table public.session_events add column if not exists event_type text;
alter table public.session_events add column if not exists event_message text;
alter table public.session_events add column if not exists created_at timestamptz not null default now();

alter table public.notifications add column if not exists id uuid default gen_random_uuid();
alter table public.notifications add column if not exists notification_type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists venue_id uuid references public.venues(id) on delete set null;
alter table public.notifications add column if not exists field_id uuid references public.fields(id) on delete set null;
alter table public.notifications add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

alter table public.external_sources add column if not exists id uuid default gen_random_uuid();
alter table public.external_sources add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.external_sources add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.external_sources add column if not exists source_type text not null default 'other';
alter table public.external_sources add column if not exists source_name text not null default 'External Source';
alter table public.external_sources add column if not exists source_url text;
alter table public.external_sources add column if not exists source_status text not null default 'not_configured';
alter table public.external_sources add column if not exists last_sync_at timestamptz;
alter table public.external_sources add column if not exists notes text;
alter table public.external_sources add column if not exists created_at timestamptz not null default now();
alter table public.external_sources add column if not exists updated_at timestamptz not null default now();

alter table public.sync_jobs add column if not exists id uuid default gen_random_uuid();
alter table public.sync_jobs add column if not exists source_id uuid references public.external_sources(id) on delete set null;
alter table public.sync_jobs add column if not exists source_type text not null default 'other';
alter table public.sync_jobs add column if not exists status text not null default 'pending';
alter table public.sync_jobs add column if not exists records_found integer not null default 0;
alter table public.sync_jobs add column if not exists records_imported integer not null default 0;
alter table public.sync_jobs add column if not exists records_skipped integer not null default 0;
alter table public.sync_jobs add column if not exists created_at timestamptz not null default now();
alter table public.sync_jobs add column if not exists completed_at timestamptz;

alter table public.sync_queue add column if not exists id uuid default gen_random_uuid();
alter table public.sync_queue add column if not exists sync_job_id uuid references public.sync_jobs(id) on delete cascade;
alter table public.sync_queue add column if not exists source_record_id text not null default '';
alter table public.sync_queue add column if not exists source_data jsonb not null default '{}'::jsonb;
alter table public.sync_queue add column if not exists review_status text not null default 'pending';
alter table public.sync_queue add column if not exists created_at timestamptz not null default now();

alter table public.sponsors add column if not exists id uuid default gen_random_uuid();
alter table public.sponsors add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.sponsors add column if not exists name text;
alter table public.sponsors add column if not exists logo_url text;
alter table public.sponsors add column if not exists website_url text;
alter table public.sponsors add column if not exists description text;
alter table public.sponsors add column if not exists created_at timestamptz not null default now();
alter table public.sponsors add column if not exists updated_at timestamptz not null default now();

alter table public.sponsor_assignments add column if not exists id uuid default gen_random_uuid();
alter table public.sponsor_assignments add column if not exists sponsor_id uuid references public.sponsors(id) on delete cascade;
alter table public.sponsor_assignments add column if not exists assignment_type text not null default 'field';
alter table public.sponsor_assignments add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.sponsor_assignments add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.sponsor_assignments add column if not exists session_id uuid references public.sessions(id) on delete cascade;
alter table public.sponsor_assignments add column if not exists placement_label text not null default 'Featured Sponsor';
alter table public.sponsor_assignments add column if not exists created_at timestamptz not null default now();
alter table public.sponsor_assignments add column if not exists updated_at timestamptz not null default now();

alter table public.sponsor_impressions add column if not exists id uuid default gen_random_uuid();
alter table public.sponsor_impressions add column if not exists sponsor_id uuid references public.sponsors(id) on delete cascade;
alter table public.sponsor_impressions add column if not exists field_id uuid references public.fields(id) on delete set null;
alter table public.sponsor_impressions add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.sponsor_impressions add column if not exists viewed_at timestamptz not null default now();
alter table public.sponsor_impressions add column if not exists page_type text not null default 'field_page';

alter table public.sponsor_clicks add column if not exists id uuid default gen_random_uuid();
alter table public.sponsor_clicks add column if not exists sponsor_id uuid references public.sponsors(id) on delete cascade;
alter table public.sponsor_clicks add column if not exists field_id uuid references public.fields(id) on delete set null;
alter table public.sponsor_clicks add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.sponsor_clicks add column if not exists clicked_at timestamptz not null default now();
alter table public.sponsor_clicks add column if not exists page_type text not null default 'field_page';

alter table public.field_page_views add column if not exists id uuid default gen_random_uuid();
alter table public.field_page_views add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.field_page_views add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.field_page_views add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.field_page_views add column if not exists viewed_at timestamptz not null default now();
alter table public.field_page_views add column if not exists page_type text not null default 'field_page';
alter table public.field_page_views add column if not exists user_agent text;

alter table public.follows add column if not exists id uuid default gen_random_uuid();
alter table public.follows add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.follows add column if not exists session_id uuid references public.sessions(id) on delete set null;
alter table public.follows add column if not exists follow_type text not null default 'field';
alter table public.follows add column if not exists display_name text;
alter table public.follows add column if not exists created_at timestamptz not null default now();

alter table public.alerts add column if not exists id uuid default gen_random_uuid();
alter table public.alerts add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.alerts add column if not exists title text;
alter table public.alerts add column if not exists message text;
alter table public.alerts add column if not exists alert_type text not null default 'info';
alter table public.alerts add column if not exists alert_scope text not null default 'venue';
alter table public.alerts add column if not exists alert_priority text not null default 'normal';
alter table public.alerts add column if not exists alert_visibility text not null default 'public';
alter table public.alerts add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.alerts add column if not exists tournament_id uuid references public.tournaments(id) on delete cascade;
alter table public.alerts add column if not exists field_id uuid references public.fields(id) on delete cascade;
alter table public.alerts add column if not exists start_time timestamptz not null default now();
alter table public.alerts add column if not exists end_time timestamptz not null default (now() + interval '4 hours');
alter table public.alerts add column if not exists is_active boolean not null default true;
alter table public.alerts add column if not exists created_at timestamptz not null default now();
alter table public.alerts add column if not exists updated_at timestamptz not null default now();

-- Constraint catch-up. These are added only when missing.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sponsor_assignments_target_check') then
    alter table public.sponsor_assignments
      add constraint sponsor_assignments_target_check check (
        (assignment_type = 'venue' and venue_id is not null and field_id is null and session_id is null)
        or (assignment_type = 'field' and venue_id is null and field_id is not null and session_id is null)
        or (assignment_type = 'session' and venue_id is null and field_id is null and session_id is not null)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'follows_session_type_check') then
    alter table public.follows
      add constraint follows_session_type_check check (
        (follow_type = 'field' and session_id is null)
        or (follow_type = 'session' and session_id is not null)
      );
  end if;
end $$;

-- Index catch-up.
create index if not exists role_assignments_organization_id_idx on public.role_assignments(organization_id);
create index if not exists role_assignments_role_type_idx on public.role_assignments(role_type);
create index if not exists role_assignments_email_idx on public.role_assignments(email);
create index if not exists venues_organization_id_idx on public.venues(organization_id);
create index if not exists fields_venue_id_idx on public.fields(venue_id);
create index if not exists fields_organization_id_idx on public.fields(organization_id);
create index if not exists resources_venue_id_idx on public.resources(venue_id);
create index if not exists resources_organization_id_idx on public.resources(organization_id);
create index if not exists resources_field_id_idx on public.resources(field_id);
create index if not exists resources_status_idx on public.resources(status);
create index if not exists sessions_field_id_idx on public.sessions(field_id);
create index if not exists sessions_organization_id_idx on public.sessions(organization_id);
create index if not exists sessions_tournament_id_idx on public.sessions(tournament_id);
create index if not exists sessions_is_demo_idx on public.sessions(is_demo);
create unique index if not exists sessions_external_source_unique_idx
  on public.sessions(external_source, external_source_id)
  where external_source is not null and external_source_id is not null;
create index if not exists tournaments_organization_id_idx on public.tournaments(organization_id);
create index if not exists scoreboard_profiles_organization_id_idx on public.scoreboard_profiles(organization_id);
create index if not exists scoreboard_profiles_venue_id_idx on public.scoreboard_profiles(venue_id);
create index if not exists scoreboard_profiles_field_id_idx on public.scoreboard_profiles(field_id);
create index if not exists scoreboard_profiles_resource_id_idx on public.scoreboard_profiles(resource_id);
create index if not exists scoreboard_profiles_status_idx on public.scoreboard_profiles(scoreboard_status);
create index if not exists scoreboard_adapters_scoreboard_id_idx on public.scoreboard_adapters(scoreboard_id);
create index if not exists scoreboard_adapters_type_idx on public.scoreboard_adapters(adapter_type);
create index if not exists scoreboard_adapters_status_idx on public.scoreboard_adapters(adapter_status);
create index if not exists audio_profiles_organization_id_idx on public.audio_profiles(organization_id);
create index if not exists audio_profiles_venue_id_idx on public.audio_profiles(venue_id);
create index if not exists audio_profiles_field_id_idx on public.audio_profiles(field_id);
create index if not exists audio_profiles_session_id_idx on public.audio_profiles(session_id);
create index if not exists audio_profiles_status_idx on public.audio_profiles(status);
create index if not exists weather_profiles_venue_id_idx on public.weather_profiles(venue_id);
create index if not exists weather_profiles_status_idx on public.weather_profiles(status);
create index if not exists weather_profiles_source_idx on public.weather_profiles(weather_source);
create index if not exists resource_activations_venue_id_idx on public.resource_activations(venue_id);
create index if not exists resource_activations_field_id_idx on public.resource_activations(field_id);
create index if not exists resource_activations_session_id_idx on public.resource_activations(session_id);
create index if not exists resource_activations_status_idx on public.resource_activations(status);
create index if not exists volunteer_roles_venue_id_idx on public.volunteer_roles(venue_id);
create index if not exists volunteer_roles_field_id_idx on public.volunteer_roles(field_id);
create index if not exists volunteer_roles_session_id_idx on public.volunteer_roles(session_id);
create index if not exists volunteer_roles_status_idx on public.volunteer_roles(status);
create index if not exists session_events_session_id_idx on public.session_events(session_id);
create index if not exists session_events_created_at_idx on public.session_events(created_at);
create index if not exists session_events_event_type_idx on public.session_events(event_type);
create index if not exists notifications_type_created_at_idx on public.notifications(notification_type, created_at desc);
create index if not exists notifications_venue_id_idx on public.notifications(venue_id);
create index if not exists notifications_field_id_idx on public.notifications(field_id);
create index if not exists notifications_session_id_idx on public.notifications(session_id);
create index if not exists external_sources_venue_id_idx on public.external_sources(venue_id);
create index if not exists external_sources_organization_id_idx on public.external_sources(organization_id);
create index if not exists external_sources_source_type_idx on public.external_sources(source_type);
create index if not exists external_sources_source_status_idx on public.external_sources(source_status);
create index if not exists sync_jobs_source_id_idx on public.sync_jobs(source_id);
create index if not exists sync_jobs_status_idx on public.sync_jobs(status);
create index if not exists sync_jobs_created_at_idx on public.sync_jobs(created_at desc);
create index if not exists sync_queue_sync_job_id_idx on public.sync_queue(sync_job_id);
create index if not exists sync_queue_review_status_idx on public.sync_queue(review_status);
create index if not exists sync_queue_created_at_idx on public.sync_queue(created_at desc);
create index if not exists sponsors_organization_id_idx on public.sponsors(organization_id);
create index if not exists sponsor_assignments_sponsor_id_idx on public.sponsor_assignments(sponsor_id);
create index if not exists sponsor_assignments_venue_id_idx on public.sponsor_assignments(venue_id);
create index if not exists sponsor_assignments_field_id_idx on public.sponsor_assignments(field_id);
create index if not exists sponsor_assignments_session_id_idx on public.sponsor_assignments(session_id);
create index if not exists sponsor_impressions_sponsor_id_idx on public.sponsor_impressions(sponsor_id);
create index if not exists sponsor_impressions_viewed_at_idx on public.sponsor_impressions(viewed_at);
create index if not exists sponsor_clicks_sponsor_id_idx on public.sponsor_clicks(sponsor_id);
create index if not exists sponsor_clicks_clicked_at_idx on public.sponsor_clicks(clicked_at);
create index if not exists field_page_views_venue_id_idx on public.field_page_views(venue_id);
create index if not exists field_page_views_field_id_idx on public.field_page_views(field_id);
create index if not exists field_page_views_session_id_idx on public.field_page_views(session_id);
create index if not exists field_page_views_viewed_at_idx on public.field_page_views(viewed_at);
create index if not exists follows_field_id_idx on public.follows(field_id);
create index if not exists follows_session_id_idx on public.follows(session_id);
create index if not exists follows_created_at_idx on public.follows(created_at);
create index if not exists alerts_venue_id_idx on public.alerts(venue_id);
create index if not exists alerts_organization_id_idx on public.alerts(organization_id);
create index if not exists alerts_tournament_id_idx on public.alerts(tournament_id);
create index if not exists alerts_field_id_idx on public.alerts(field_id);
create index if not exists alerts_scope_idx on public.alerts(alert_scope);
create index if not exists alerts_priority_idx on public.alerts(alert_priority);
create index if not exists alerts_visibility_idx on public.alerts(alert_visibility);
create index if not exists alerts_active_window_idx on public.alerts(is_active, start_time, end_time);

-- RLS catch-up. Policy creation is intentionally left to existing migrations/schema
-- and the Schema Audit page because Postgres does not support CREATE POLICY IF NOT EXISTS.
alter table public.organizations enable row level security;
alter table public.role_assignments enable row level security;
alter table public.venues enable row level security;
alter table public.fields enable row level security;
alter table public.resources enable row level security;
alter table public.tournaments enable row level security;
alter table public.sessions enable row level security;
alter table public.scoreboard_profiles enable row level security;
alter table public.scoreboard_adapters enable row level security;
alter table public.audio_profiles enable row level security;
alter table public.weather_profiles enable row level security;
alter table public.resource_activations enable row level security;
alter table public.volunteer_roles enable row level security;
alter table public.session_events enable row level security;
alter table public.notifications enable row level security;
alter table public.external_sources enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.sync_queue enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_assignments enable row level security;
alter table public.sponsor_impressions enable row level security;
alter table public.sponsor_clicks enable row level security;
alter table public.field_page_views enable row level security;
alter table public.follows enable row level security;
alter table public.alerts enable row level security;
