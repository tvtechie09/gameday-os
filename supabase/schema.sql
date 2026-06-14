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
  address text,
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

create index if not exists fields_venue_id_idx on public.fields(venue_id);
create index if not exists role_assignments_organization_id_idx on public.role_assignments(organization_id);
create index if not exists role_assignments_role_type_idx on public.role_assignments(role_type);
create index if not exists role_assignments_email_idx on public.role_assignments(email);
create index if not exists venues_organization_id_idx on public.venues(organization_id);
create index if not exists fields_organization_id_idx on public.fields(organization_id);
create index if not exists resources_venue_id_idx on public.resources(venue_id);
create index if not exists resources_organization_id_idx on public.resources(organization_id);
create index if not exists resources_field_id_idx on public.resources(field_id);
create index if not exists resources_status_idx on public.resources(status);
create index if not exists scoreboard_profiles_organization_id_idx on public.scoreboard_profiles(organization_id);
create index if not exists scoreboard_profiles_venue_id_idx on public.scoreboard_profiles(venue_id);
create index if not exists scoreboard_profiles_field_id_idx on public.scoreboard_profiles(field_id);
create index if not exists scoreboard_profiles_resource_id_idx on public.scoreboard_profiles(resource_id);
create index if not exists scoreboard_profiles_status_idx on public.scoreboard_profiles(scoreboard_status);
create index if not exists resource_activations_venue_id_idx on public.resource_activations(venue_id);
create index if not exists resource_activations_field_id_idx on public.resource_activations(field_id);
create index if not exists resource_activations_session_id_idx on public.resource_activations(session_id);
create index if not exists resource_activations_status_idx on public.resource_activations(status);
create index if not exists volunteer_roles_venue_id_idx on public.volunteer_roles(venue_id);
create index if not exists volunteer_roles_field_id_idx on public.volunteer_roles(field_id);
create index if not exists volunteer_roles_session_id_idx on public.volunteer_roles(session_id);
create index if not exists volunteer_roles_status_idx on public.volunteer_roles(status);
create index if not exists sessions_field_id_idx on public.sessions(field_id);
create index if not exists sessions_organization_id_idx on public.sessions(organization_id);
create index if not exists sessions_tournament_id_idx on public.sessions(tournament_id);
create index if not exists tournaments_organization_id_idx on public.tournaments(organization_id);
create unique index if not exists sessions_external_source_unique_idx
  on public.sessions(external_source, external_source_id)
  where external_source is not null and external_source_id is not null;
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
create index if not exists sponsor_assignments_sponsor_id_idx on public.sponsor_assignments(sponsor_id);
create index if not exists sponsors_organization_id_idx on public.sponsors(organization_id);
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

alter table public.organizations enable row level security;
alter table public.role_assignments enable row level security;
alter table public.venues enable row level security;
alter table public.fields enable row level security;
alter table public.resources enable row level security;
alter table public.scoreboard_profiles enable row level security;
alter table public.resource_activations enable row level security;
alter table public.volunteer_roles enable row level security;
alter table public.tournaments enable row level security;
alter table public.sessions enable row level security;
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

create policy "Public can read organizations"
  on public.organizations for select
  using (true);

create policy "Public can read role assignments"
  on public.role_assignments for select
  using (true);

create policy "Public can read venues"
  on public.venues for select
  using (true);

create policy "Public can create venues"
  on public.venues for insert
  with check (true);

create policy "Public can read fields"
  on public.fields for select
  using (true);

create policy "Public can read resources"
  on public.resources for select
  using (true);

create policy "Public can read scoreboard profiles"
  on public.scoreboard_profiles for select
  using (true);

create policy "Public can create scoreboard profiles"
  on public.scoreboard_profiles for insert
  with check (true);

create policy "Public can update scoreboard profiles"
  on public.scoreboard_profiles for update
  using (true)
  with check (true);

create policy "Public can read resource activations"
  on public.resource_activations for select
  using (true);

create policy "Public can read volunteer roles"
  on public.volunteer_roles for select
  using (true);

create policy "Public can read tournaments"
  on public.tournaments for select
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

create policy "Public can read session events"
  on public.session_events for select
  using (true);

create policy "Public can create session events"
  on public.session_events for insert
  with check (true);

create policy "Public can read notifications"
  on public.notifications for select
  using (true);

create policy "Public can create notifications"
  on public.notifications for insert
  with check (true);

create policy "Public can read external sources"
  on public.external_sources for select
  using (true);

create policy "Public can create external sources"
  on public.external_sources for insert
  with check (true);

create policy "Public can read sync jobs"
  on public.sync_jobs for select
  using (true);

create policy "Public can create sync jobs"
  on public.sync_jobs for insert
  with check (true);

create policy "Public can update sync jobs"
  on public.sync_jobs for update
  using (true)
  with check (true);

create policy "Public can read sync queue"
  on public.sync_queue for select
  using (true);

create policy "Public can create sync queue"
  on public.sync_queue for insert
  with check (true);

create policy "Public can update sync queue"
  on public.sync_queue for update
  using (true)
  with check (true);

create policy "Public can read sponsors"
  on public.sponsors for select
  using (true);

create policy "Public can read sponsor assignments"
  on public.sponsor_assignments for select
  using (true);

create policy "Public can insert field page views"
  on public.field_page_views for insert
  with check (true);

create policy "Public can read field page views"
  on public.field_page_views for select
  using (true);

create policy "Public can insert follows"
  on public.follows for insert
  with check (true);

create policy "Public can read follows"
  on public.follows for select
  using (true);

create policy "Public can read alerts"
  on public.alerts for select
  using (true);
