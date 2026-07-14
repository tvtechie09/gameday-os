-- Orphan game_states table (0 rows, no code refs, DB drift — a batting-order
-- scoreboard prototype). Discovered during the Connected Game Engine migration
-- review. Close its anon-readable surface with deny-all RLS, matching the
-- orphan `scoreboards` treatment. Not dropped (standing rule); drop is a later
-- follow-up once confirmed unneeded. Applied live 2026-07-13.
alter table public.game_states enable row level security;
