-- Applied live 2026-07-13 (security review).
-- 1) `scoreboards` is an orphan legacy table (the app reads scoreboard_profiles,
--    never bare scoreboards) but was anon-readable with RLS off. Enable RLS.
-- 2) `venue_technology_profile` is a non-sensitive aggregate view unused by app
--    code, but SECURITY DEFINER bypasses RLS on its base tables. Switch to
--    security_invoker so it honors the caller's permissions.
do $$
begin
  if to_regclass('public.scoreboards') is not null then
    alter table public.scoreboards enable row level security;
  end if;
  if to_regclass('public.venue_technology_profile') is not null then
    alter view public.venue_technology_profile set (security_invoker = true);
  end if;
end;
$$;
