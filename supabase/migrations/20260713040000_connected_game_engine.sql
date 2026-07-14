-- Connected Game Engine — Sprint 1 foundation (ADR-connected-game-engine).
-- STATUS: GENERATED, NOT APPLIED. Review docs/reports/connected-game-engine-sprint-1.md
-- (migration safety section) before applying. Additive only: no drops, no renames.
--
-- Layer 1: sessions = canonical Game (extended with a constrained lifecycle).
-- Layer 2: game_states = current mutable, sport-extensible live state.
-- Layer 3: game_events = append-only, tenant-aware, idempotent event ledger.

-- ---------------------------------------------------------------------------
-- 1) Canonical Game: constrained lifecycle on sessions (additive column;
--    legacy status/game_status stay authoritative for existing consumers and
--    are kept in sync by the Game domain service).
alter table public.sessions
  add column if not exists lifecycle_status text not null default 'scheduled';

alter table public.sessions
  drop constraint if exists sessions_lifecycle_status_check;
alter table public.sessions
  add constraint sessions_lifecycle_status_check
  check (lifecycle_status in (
    'draft','scheduled','check_in','warmup','ready','live',
    'delayed','suspended','postponed','cancelled','final','archived'
  ));

-- Backfill from the legacy status columns.
update public.sessions set lifecycle_status =
  case
    when coalesce(game_status, status) = 'active' then 'live'
    when coalesce(game_status, status) = 'final' then 'final'
    else 'scheduled'
  end
where lifecycle_status = 'scheduled';

-- External source mapping: one game per (source, external id).
create unique index if not exists sessions_external_source_unique
  on public.sessions (external_source, external_source_id)
  where external_source is not null and external_source_id is not null;

-- ---------------------------------------------------------------------------
-- 2) Current mutable game state (one row per game; sport-extensible).
create table if not exists public.game_states (
  game_id uuid primary key references public.sessions (id) on delete cascade,
  organization_id uuid,
  sport_type text not null default 'baseball',
  score_home integer not null default 0,
  score_away integer not null default 0,
  -- Sport-specific live state: period/inning/half/quarter/clock/possession/
  -- outs/balls/strikes/sets/overtime/shootout/meta — keyed by sport, no sport
  -- forces columns on another.
  state jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_by_actor_type text,
  updated_by_actor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_states_org_idx on public.game_states (organization_id);

alter table public.game_states enable row level security;
-- Scores are public product surface (QR field pages, scoreboards) — match the
-- sessions public-read posture. Writes: service role only (no policies).
drop policy if exists game_states_public_read on public.game_states;
create policy game_states_public_read on public.game_states
  for select using (true);

-- ---------------------------------------------------------------------------
-- 3) Append-only game event ledger.
create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  game_id uuid not null references public.sessions (id) on delete cascade,
  event_type text not null,
  event_version integer not null default 1,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  actor_type text not null default 'system',
  actor_id text,
  source_type text not null default 'venue-app',
  source_id text,
  correlation_id text,
  causation_id text,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

-- Idempotency: at-least-once producers are deduped per game.
create unique index if not exists game_events_idempotency_unique
  on public.game_events (game_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists game_events_game_time_idx
  on public.game_events (game_id, recorded_at);
create index if not exists game_events_org_time_idx
  on public.game_events (organization_id, recorded_at);
create index if not exists game_events_type_idx
  on public.game_events (event_type);

alter table public.game_events enable row level security;
-- Ledger may carry actor/device detail: NOT public. Service-role only this
-- sprint (no policies = deny anon/authenticated); selective projections later.

-- ---------------------------------------------------------------------------
-- 4) Controlled write path: transactional state update + event append with
--    optimistic concurrency and idempotent replay.
create or replace function public.game_engine_apply(
  p_game_id uuid,
  p_expected_version integer,
  p_score_home integer,
  p_score_away integer,
  p_state jsonb,
  p_lifecycle_status text,
  p_organization_id uuid,
  p_sport_type text,
  p_event_type text,
  p_event_version integer,
  p_occurred_at timestamptz,
  p_actor_type text,
  p_actor_id text,
  p_source_type text,
  p_source_id text,
  p_correlation_id text,
  p_causation_id text,
  p_idempotency_key text,
  p_payload jsonb,
  p_metadata jsonb
) returns table (accepted boolean, replayed boolean, new_version integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_event uuid;
  v_version integer;
begin
  -- Idempotent replay: same key => acknowledge without mutating anything.
  if p_idempotency_key is not null then
    select id into v_existing_event
      from game_events
      where game_id = p_game_id and idempotency_key = p_idempotency_key;
    if v_existing_event is not null then
      select version into v_version from game_states where game_id = p_game_id;
      return query select true, true, coalesce(v_version, 1);
      return;
    end if;
  end if;

  -- Upsert current state with optimistic concurrency.
  insert into game_states (game_id, organization_id, sport_type, score_home, score_away, state, version, updated_by_actor_type, updated_by_actor_id, updated_at)
  values (p_game_id, p_organization_id, p_sport_type, coalesce(p_score_home, 0), coalesce(p_score_away, 0), coalesce(p_state, '{}'::jsonb), 1, p_actor_type, p_actor_id, now())
  on conflict (game_id) do update set
    score_home = coalesce(p_score_home, game_states.score_home),
    score_away = coalesce(p_score_away, game_states.score_away),
    state = game_states.state || coalesce(p_state, '{}'::jsonb),
    version = game_states.version + 1,
    updated_by_actor_type = p_actor_type,
    updated_by_actor_id = p_actor_id,
    updated_at = now()
  where p_expected_version is null or game_states.version = p_expected_version;

  if not found then
    -- Insert path always "finds"; reaching here means version conflict.
    return query select false, false, (select version from game_states where game_id = p_game_id);
    return;
  end if;

  -- Keep the canonical lifecycle + legacy projection in sync when supplied.
  if p_lifecycle_status is not null then
    update sessions set
      lifecycle_status = p_lifecycle_status,
      status = case when p_lifecycle_status in ('live','suspended') then 'active'
                    when p_lifecycle_status in ('final','cancelled','archived') then 'final'
                    else 'scheduled' end,
      game_status = case when p_lifecycle_status in ('live','suspended') then 'active'
                         when p_lifecycle_status in ('final','cancelled','archived') then 'final'
                         else 'scheduled' end,
      updated_at = now()
    where id = p_game_id;
  end if;

  -- Append the immutable event.
  insert into game_events (organization_id, game_id, event_type, event_version, occurred_at, actor_type, actor_id, source_type, source_id, correlation_id, causation_id, idempotency_key, payload, metadata)
  values (p_organization_id, p_game_id, p_event_type, coalesce(p_event_version, 1), coalesce(p_occurred_at, now()), coalesce(p_actor_type, 'system'), p_actor_id, coalesce(p_source_type, 'venue-app'), p_source_id, p_correlation_id, p_causation_id, p_idempotency_key, coalesce(p_payload, '{}'::jsonb), coalesce(p_metadata, '{}'::jsonb));

  select version into v_version from game_states where game_id = p_game_id;
  return query select true, false, v_version;
end;
$$;

revoke all on function public.game_engine_apply from public, anon, authenticated;
