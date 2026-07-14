-- Connected Game Engine — Sprint 2 (#6): keep `sessions` a COMPLETE legacy
-- projection of the live score.
--
-- Before this, game_engine_apply synced only lifecycle_status -> legacy
-- status/game_status. The score lived in game_live_state, and the scorekeeper
-- happened to also write sessions.home_score/away_score on its own primary path
-- — but ENGINE-ONLY writers (the Daktronics device adapter, future
-- integrations) updated only game_live_state. So anything still reading the
-- sessions columns (team-app family calendars/linked games, exports, the
-- field-page server render) missed device/integration scores.
--
-- Fix: after the state upsert, project the resulting score back onto the
-- sessions columns whenever the apply carried a score (p_score_home/away NOT
-- NULL). Guarded so a lifecycle-only apply (e.g. Start Game) never zeroes an
-- existing score. Additive; every sessions reader now stays complete with no
-- per-consumer change.
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
  if p_idempotency_key is not null then
    select id into v_existing_event
      from game_events
      where game_id = p_game_id and idempotency_key = p_idempotency_key;
    if v_existing_event is not null then
      select version into v_version from game_live_state where game_id = p_game_id;
      return query select true, true, coalesce(v_version, 1);
      return;
    end if;
  end if;

  insert into game_live_state (game_id, organization_id, sport_type, score_home, score_away, state, version, updated_by_actor_type, updated_by_actor_id, updated_at)
  values (p_game_id, p_organization_id, p_sport_type, coalesce(p_score_home, 0), coalesce(p_score_away, 0), coalesce(p_state, '{}'::jsonb), 1, p_actor_type, p_actor_id, now())
  on conflict (game_id) do update set
    score_home = coalesce(p_score_home, game_live_state.score_home),
    score_away = coalesce(p_score_away, game_live_state.score_away),
    state = game_live_state.state || coalesce(p_state, '{}'::jsonb),
    version = game_live_state.version + 1,
    updated_by_actor_type = p_actor_type,
    updated_by_actor_id = p_actor_id,
    updated_at = now()
  where p_expected_version is null or game_live_state.version = p_expected_version;

  if not found then
    return query select false, false, (select version from game_live_state where game_id = p_game_id);
    return;
  end if;

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

  -- Project the authoritative score back onto the legacy session columns so
  -- every sessions reader stays complete. Only when a score was supplied, so a
  -- lifecycle-only apply never overwrites an existing score with zeroes.
  if p_score_home is not null or p_score_away is not null then
    update sessions s set
      home_score = gls.score_home,
      away_score = gls.score_away,
      updated_at = now()
    from game_live_state gls
    where s.id = p_game_id and gls.game_id = p_game_id;
  end if;

  insert into game_events (organization_id, game_id, event_type, event_version, occurred_at, actor_type, actor_id, source_type, source_id, correlation_id, causation_id, idempotency_key, payload, metadata)
  values (p_organization_id, p_game_id, p_event_type, coalesce(p_event_version, 1), coalesce(p_occurred_at, now()), coalesce(p_actor_type, 'system'), p_actor_id, coalesce(p_source_type, 'venue-app'), p_source_id, p_correlation_id, p_causation_id, p_idempotency_key, coalesce(p_payload, '{}'::jsonb), coalesce(p_metadata, '{}'::jsonb));

  select version into v_version from game_live_state where game_id = p_game_id;
  return query select true, false, v_version;
end;
$$;

revoke all on function public.game_engine_apply from public, anon, authenticated;
