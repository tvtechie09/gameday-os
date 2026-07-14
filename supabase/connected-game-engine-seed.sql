-- Connected Game Engine — demonstration seed (Sprint 1).
-- STATUS: NOT APPLIED. Apply only to development/staging after the
-- 20260713040000 migration. Clearly identified via is_demo=true and the
-- [CGE SEED] title prefix; idempotent via fixed UUIDs. References EXISTING
-- venues by name — inserts nothing if a venue/field is missing, and never
-- duplicates venue records.
--   * "Manhattan Junior High" (existing venue)
--   * "Crossroads Test Complex" (the New Lenox Crossroads demo venue)

with mjh_field as (
  select f.id, f.venue_id from fields f
  join venues v on v.id = f.venue_id and v.name = 'Manhattan Junior High'
  order by f.name limit 1
), cross_field as (
  select f.id, f.venue_id from fields f
  join venues v on v.id = f.venue_id and v.name = 'Crossroads Test Complex'
  order by f.name limit 1
)
insert into sessions (id, field_id, title, sport_type, home_team, away_team, start_time, end_time, status, game_status, lifecycle_status, is_demo, external_source, external_source_id)
select * from (
  -- 1) Baseball game, scheduled (Manhattan Junior High)
  select 'ce000000-0000-4000-a000-000000000001'::uuid, (select id from mjh_field),
    '[CGE SEED] Manhattan Miners vs New Lenox Knights', 'baseball',
    'Manhattan Miners 12U', 'New Lenox Knights 12U',
    (now() + interval '1 day')::timestamptz, (now() + interval '1 day 2 hours')::timestamptz,
    'scheduled', 'scheduled', 'scheduled', true, 'cge-seed', 'cge-baseball-1'
  union all
  -- 2) Softball game, scheduled (Crossroads / New Lenox)
  select 'ce000000-0000-4000-a000-000000000002'::uuid, (select id from cross_field),
    '[CGE SEED] Lincoln-Way Lightning vs Mokena Mustangs', 'softball',
    'Lincoln-Way Lightning 14U', 'Mokena Mustangs 14U',
    (now() + interval '1 day 3 hours')::timestamptz, (now() + interval '1 day 5 hours')::timestamptz,
    'scheduled', 'scheduled', 'scheduled', true, 'cge-seed', 'cge-softball-1'
  union all
  -- 3) Delayed game (Crossroads / New Lenox)
  select 'ce000000-0000-4000-a000-000000000003'::uuid, (select id from cross_field),
    '[CGE SEED] Frankfort Falcons vs Joliet Giants (delayed)', 'baseball',
    'Frankfort Falcons 10U', 'Joliet Giants 10U',
    (now() - interval '1 hour')::timestamptz, (now() + interval '1 hour')::timestamptz,
    'scheduled', 'scheduled', 'delayed', true, 'cge-seed', 'cge-delayed-1'
  union all
  -- 4) Completed game (Manhattan Junior High)
  select 'ce000000-0000-4000-a000-000000000004'::uuid, (select id from mjh_field),
    '[CGE SEED] Manhattan Miners vs Frankfort Falcons (final)', 'baseball',
    'Manhattan Miners 12U', 'Frankfort Falcons 12U',
    (now() - interval '1 day')::timestamptz, (now() - interval '1 day' + interval '2 hours')::timestamptz,
    'final', 'final', 'final', true, 'cge-seed', 'cge-final-1'
) seed(id, field_id, title, sport_type, home_team, away_team, start_time, end_time, status, game_status, lifecycle_status, is_demo, external_source, external_source_id)
where seed.field_id is not null
on conflict (id) do nothing;

-- Current state + a small event history for the delayed and final games.
insert into game_live_state (game_id, sport_type, score_home, score_away, state, version)
values
  ('ce000000-0000-4000-a000-000000000003', 'baseball', 2, 1, '{"inning": 3, "half": "top", "outs": 1}'::jsonb, 3),
  ('ce000000-0000-4000-a000-000000000004', 'baseball', 6, 4, '{"inning": 6, "half": "bottom", "outs": 3}'::jsonb, 9)
on conflict (game_id) do nothing;

insert into game_events (game_id, event_type, actor_type, source_type, idempotency_key, payload)
values
  ('ce000000-0000-4000-a000-000000000003', 'game.started', 'user', 'venue-app', 'cge-seed:delayed:start', '{"to":"live"}'::jsonb),
  ('ce000000-0000-4000-a000-000000000003', 'score.changed', 'scorekeeper', 'venue-app', 'cge-seed:delayed:score1', '{"home":2,"away":1}'::jsonb),
  ('ce000000-0000-4000-a000-000000000003', 'game.delayed', 'user', 'venue-app', 'cge-seed:delayed:delay', '{"from":"live","to":"delayed","reason":"weather"}'::jsonb),
  ('ce000000-0000-4000-a000-000000000004', 'game.started', 'user', 'venue-app', 'cge-seed:final:start', '{"to":"live"}'::jsonb),
  ('ce000000-0000-4000-a000-000000000004', 'game.completed', 'user', 'venue-app', 'cge-seed:final:complete', '{"from":"live","to":"final","home":6,"away":4}'::jsonb)
on conflict do nothing;
