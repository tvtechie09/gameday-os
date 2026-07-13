-- Applied live 2026-07-13 (security review).
-- 1) `scoreboards` is an orphan legacy table (the app reads scoreboard_profiles,
--    never bare scoreboards) but was anon-readable with RLS off. Enable RLS.
-- 2) `venue_technology_profile` is a non-sensitive aggregate view unused by app
--    code, but SECURITY DEFINER bypasses RLS on its base tables. Switch to
--    security_invoker so it honors the caller's permissions.
alter table public.scoreboards enable row level security;
alter view public.venue_technology_profile set (security_invoker = true);
