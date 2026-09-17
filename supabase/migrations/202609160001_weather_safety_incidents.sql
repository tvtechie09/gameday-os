-- Weather & Safety Operations 1.0A
-- Durable, tenant-scoped operational truth for manual/automatic safety incidents.
-- This first persistence slice is intentionally server-only: RLS is enabled
-- with no direct client policies. Service-role orchestration may persist and
-- project incident state; browser clients should consume scoped projections.

create table if not exists public.weather_safety_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  incident_type text not null check (incident_type in ('LIGHTNING_HOLD')),
  status text not null default 'active' check (status in ('active', 'cleared')),
  source text not null check (source in ('manual', 'automatic')),
  provider_health text not null check (provider_health in ('online', 'offline', 'unavailable')),
  declared_by_user_id uuid not null references public.users(id) on delete restrict,
  declared_at timestamptz not null default now(),
  cleared_by_user_id uuid references public.users(id) on delete restrict,
  cleared_at timestamptz,
  next_update_at timestamptz,
  clearance_criteria text,
  affected_field_ids jsonb not null default '[]'::jsonb,
  affected_session_ids jsonb not null default '[]'::jsonb,
  prior_field_states jsonb not null,
  prior_session_states jsonb not null default '{}'::jsonb,
  transition_history jsonb not null default '[]'::jsonb,
  delivery_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weather_safety_incidents_clear_state_check check (
    (status = 'active' and cleared_at is null and cleared_by_user_id is null)
    or
    (status = 'cleared' and cleared_at is not null and cleared_by_user_id is not null)
  ),
  constraint weather_safety_incidents_field_ids_array_check check (jsonb_typeof(affected_field_ids) = 'array'),
  constraint weather_safety_incidents_session_ids_array_check check (jsonb_typeof(affected_session_ids) = 'array'),
  constraint weather_safety_incidents_prior_field_states_object_check check (jsonb_typeof(prior_field_states) = 'object'),
  constraint weather_safety_incidents_prior_session_states_object_check check (jsonb_typeof(prior_session_states) = 'object'),
  constraint weather_safety_incidents_transition_history_array_check check (jsonb_typeof(transition_history) = 'array'),
  constraint weather_safety_incidents_delivery_history_array_check check (jsonb_typeof(delivery_history) = 'array')
);

-- A venue may have only one active incident of a given safety type. This is the
-- database backstop for idempotent declaration/retry behavior.
create unique index if not exists weather_safety_incidents_one_active_per_venue_type
  on public.weather_safety_incidents (organization_id, venue_id, incident_type)
  where status = 'active';

create index if not exists weather_safety_incidents_org_venue_idx
  on public.weather_safety_incidents (organization_id, venue_id, declared_at desc);

create index if not exists weather_safety_incidents_status_idx
  on public.weather_safety_incidents (status, declared_at desc);

alter table public.weather_safety_incidents enable row level security;

comment on table public.weather_safety_incidents is
  'Canonical Weather & Safety incident truth. RLS intentionally has no direct client policies in 1.0A; server-side scoped services own mutation and projection.';
