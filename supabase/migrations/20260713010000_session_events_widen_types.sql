-- Applied live 2026-07-13: the session_events check constraint lagged the
-- TypeScript SessionEventType union; operations_update/scoreboard_update
-- inserts were rejected (schedule-change notifications need the former).
alter table public.session_events drop constraint if exists session_events_event_type_check;
alter table public.session_events add constraint session_events_event_type_check
  check (event_type = any (array['session_created','score_update','resource_activated','alert_created','sponsor_clicked','game_started','game_final','operations_update','scoreboard_update']));
