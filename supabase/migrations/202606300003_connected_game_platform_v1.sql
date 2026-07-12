-- Connected Game Platform v1
-- Session becomes the architecture hub connecting teams, venue operations,
-- scoreboards, streaming placeholders, sponsor packages, media, officials,
-- and future integrations. No live hardware, streaming, or Team sync is added.

alter table public.sessions add column if not exists home_organization_id uuid references public.organizations(id) on delete set null;
alter table public.sessions add column if not exists away_organization_id uuid references public.organizations(id) on delete set null;
alter table public.sessions add column if not exists operations_status text not null default 'normal';
alter table public.sessions add column if not exists scoreboard_profile_id uuid references public.scoreboard_profiles(id) on delete set null;
alter table public.sessions add column if not exists streaming_profile jsonb not null default '{}'::jsonb;
alter table public.sessions add column if not exists walkup_music_profile jsonb not null default '{}'::jsonb;
alter table public.sessions add column if not exists sponsor_package jsonb not null default '{}'::jsonb;
alter table public.sessions add column if not exists media_links jsonb not null default '[]'::jsonb;
alter table public.sessions add column if not exists officials jsonb not null default '[]'::jsonb;

do $$
begin
  alter table public.sessions add constraint sessions_operations_status_check check (operations_status in ('normal', 'delayed', 'suspended', 'emergency', 'final_review'));
exception
  when duplicate_object then null;
end $$;

alter table public.session_events drop constraint if exists session_events_event_type_check;
alter table public.session_events add constraint session_events_event_type_check check (
  event_type in (
    'session_created',
    'score_update',
    'resource_activated',
    'alert_created',
    'sponsor_clicked',
    'game_started',
    'game_final',
    'operations_update',
    'scoreboard_update',
    'streaming_update',
    'media_added',
    'sponsor_update',
    'official_update',
    'weather_update'
  )
);

create index if not exists sessions_home_organization_id_idx on public.sessions(home_organization_id);
create index if not exists sessions_away_organization_id_idx on public.sessions(away_organization_id);
create index if not exists sessions_operations_status_idx on public.sessions(operations_status);
create index if not exists sessions_scoreboard_profile_id_idx on public.sessions(scoreboard_profile_id);
