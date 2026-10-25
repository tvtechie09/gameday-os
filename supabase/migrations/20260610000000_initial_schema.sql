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
  role_type text not null check (role_type in ('super_admin', 'organization_admin', 'field_operator', 'volunteer', 'read_only')),
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  description text,
  city text,
  state text,
  zip text,
  address text,
  latitude double precision,
  longitude double precision,
  -- IANA zone the venue stands in. Every venue-local date/time in the app (the
  -- "today" boundary, delay math, slot windows) is computed here, not in a
  -- hardcoded Central Time.
  timezone text not null default 'America/Chicago',
  parking_note text,
  status text not null default 'Draft' check (status in ('Draft', 'Live')),
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
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  sport_type text not null,
  map_label text,
  map_x numeric check (map_x between 0 and 100),
  map_y numeric check (map_y between 0 and 100),
  surface text,
  status text not null default 'open' check (status in ('open', 'active', 'delayed', 'closed', 'maintenance')),
  field_status text not null default 'open' check (field_status in ('open', 'active', 'delayed', 'closed', 'maintenance')),
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  resource_name text not null,
  resource_type text not null check (resource_type in ('camera', 'audio', 'scoreboard', 'display', 'network', 'streaming', 'other')),
  manufacturer text,
  model text,
  serial_number text,
  status text not null default 'unknown' check (status in ('active', 'inactive', 'maintenance', 'unknown')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scoreboard_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete set null,
  manufacturer text not null default 'Manual',
  model text not null default 'GameDay OS',
  connection_type text not null default 'manual' check (connection_type in ('manual', 'network', 'serial', 'controller_bridge', 'cloud_api', 'obs_overlay', 'unknown')),
  integration_mode text not null default 'manual_only' check (integration_mode in ('manual_only', 'read_only', 'write_to_scoreboard', 'write_to_overlay', 'future_hardware')),
  scoreboard_status text not null default 'not_configured' check (scoreboard_status in ('not_configured', 'configured', 'testing', 'active', 'offline')),
  ip_address text,
  controller_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scoreboard_adapters (
  id uuid primary key default gen_random_uuid(),
  scoreboard_id uuid not null references public.scoreboard_profiles(id) on delete cascade,
  adapter_type text not null default 'manual' check (adapter_type in ('manual', 'daktronics', 'nevco', 'fairplay', 'musco', 'custom')),
  adapter_status text not null default 'inactive' check (adapter_status in ('inactive', 'configured', 'testing', 'active', 'error')),
  last_sync_at timestamptz,
  notes text
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
  field_id uuid not null references public.fields(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  title text not null,
  sport_type text not null default 'baseball' check (sport_type in ('baseball', 'softball', 'soccer', 'football', 'lacrosse', 'basketball', 'volleyball', 'other')),
  home_team text not null,
  away_team text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'final')),
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  is_demo boolean not null default false,
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
  external_source text,
  external_source_id text,
  external_source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_activations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references public.resources(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  activation_type text not null check (activation_type in ('parent_camera', 'livestream_link', 'bluetooth_speaker', 'scoreboard_operator', 'announcer', 'other')),
  display_name text not null,
  contact_name text,
  contact_email text,
  resource_url text,
  status text not null default 'requested' check (status in ('requested', 'active', 'ended', 'rejected')),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  assigned_to_session boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.audio_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  audio_mode text not null default 'none' check (audio_mode in ('none', 'parent_speaker', 'venue_pa', 'bluetooth_speaker', 'obs_audio', 'future_integration')),
  speaker_type text,
  provider text,
  status text not null default 'not_configured' check (status in ('not_configured', 'configured', 'testing', 'active', 'offline')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  event_type text not null check (event_type in ('session_created', 'score_update', 'resource_activated', 'alert_created', 'sponsor_clicked', 'game_started', 'game_final')),
  event_message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null check (notification_type in ('alert', 'field_status', 'session_status', 'resource', 'volunteer', 'sponsor')),
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
  venue_id uuid not null references public.venues(id) on delete cascade,
  source_type text not null check (source_type in ('sportsengine', 'hometeamsonline', 'teamsnap', 'gamechanger', 'csv', 'ical', 'other')),
  source_name text not null,
  source_url text,
  source_status text not null default 'not_configured' check (source_status in ('connected', 'not_configured', 'error', 'paused', 'unknown')),
  last_sync_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.external_sources(id) on delete set null,
  source_type text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  records_found integer not null default 0,
  records_imported integer not null default 0,
  records_skipped integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid not null references public.sync_jobs(id) on delete cascade,
  source_record_id text not null,
  source_data jsonb not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'imported')),
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

create table if not exists public.sponsor_impressions (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  viewed_at timestamptz not null default now(),
  page_type text not null default 'field_page'
);

create table if not exists public.sponsor_clicks (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  clicked_at timestamptz not null default now(),
  page_type text not null default 'field_page'
);

create table if not exists public.field_page_views (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  viewed_at timestamptz not null default now(),
  page_type text not null default 'field_page',
  user_agent text
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  follow_type text not null check (follow_type in ('field', 'session')),
  display_name text,
  created_at timestamptz not null default now(),
  constraint follows_session_type_check check (
    (follow_type = 'field' and session_id is null)
    or (follow_type = 'session' and session_id is not null)
  )
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null,
  message text not null,
  alert_type text not null check (alert_type in ('info', 'weather', 'delay', 'emergency', 'parking', 'concession', 'field_closure')),
  alert_scope text not null default 'venue' check (alert_scope in ('venue', 'field', 'tournament', 'global')),
  alert_priority text not null default 'normal' check (alert_priority in ('low', 'normal', 'high', 'urgent')),
  alert_visibility text not null default 'public' check (alert_visibility in ('public', 'admin_only')),
  venue_id uuid not null references public.venues(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
