-- Staging Schema Reconciliation 1.0A: shared session compatibility.
--
-- These are the fields selected by the current shared session service. This
-- migration does not restore the retired Command Center UI or alter events.

alter table public.sessions
  add column home_organization_id uuid references public.organizations(id) on delete set null,
  add column away_organization_id uuid references public.organizations(id) on delete set null,
  add column operations_status text not null default 'normal',
  add column scoreboard_profile_id uuid references public.scoreboard_profiles(id) on delete set null,
  add column streaming_profile jsonb not null default '{}'::jsonb,
  add column walkup_music_profile jsonb not null default '{}'::jsonb,
  add column sponsor_package jsonb not null default '{}'::jsonb,
  add column media_links jsonb not null default '[]'::jsonb,
  add column officials jsonb not null default '[]'::jsonb;

alter table public.sessions
  add constraint sessions_operations_status_check
  check (operations_status in ('normal', 'delayed', 'suspended', 'emergency', 'final_review'));

create index sessions_home_organization_id_idx
  on public.sessions (home_organization_id);
create index sessions_away_organization_id_idx
  on public.sessions (away_organization_id);
create index sessions_operations_status_idx
  on public.sessions (operations_status);
create index sessions_scoreboard_profile_id_idx
  on public.sessions (scoreboard_profile_id);
