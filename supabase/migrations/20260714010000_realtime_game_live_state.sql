-- Connected Game Engine Sprint 2 (#5): publish game_live_state changes over
-- Supabase Realtime so public field/scoreboard pages can subscribe to live
-- scores. game_live_state is public-read; game_events is intentionally NOT
-- published (non-public ledger). REPLICA IDENTITY FULL so update payloads
-- include prior values for the client diff. Applied live 2026-07-14.
alter publication supabase_realtime add table public.game_live_state;
alter table public.game_live_state replica identity full;
