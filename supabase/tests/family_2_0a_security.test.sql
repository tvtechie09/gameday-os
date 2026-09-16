-- Family 2.0A Tournament OS security acceptance.
-- Run after 20260831235931_tournament_family_projection_2_0a.sql.

do $$
declare
  table_name text;
  view_name text;
begin
  foreach table_name in array array[
    'tournament_divisions', 'tournament_pools', 'tournament_entries',
    'tournament_standings', 'tournament_rounds',
    'tournament_game_contexts', 'tournament_game_slots',
    'tournament_venues', 'tournament_key_rules', 'tournament_documents'
  ] loop
    if not coalesce((select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass), false) then
      raise exception '% must have RLS enabled', table_name;
    end if;
    if has_table_privilege('anon', 'public.' || table_name, 'select,insert,update,delete')
      or has_table_privilege('authenticated', 'public.' || table_name, 'select,insert,update,delete') then
      raise exception 'browser roles must not access %', table_name;
    end if;
    if not has_table_privilege('service_role', 'public.' || table_name, 'select,insert,update,delete') then
      raise exception 'service_role requires canonical Tournament access to %', table_name;
    end if;
  end loop;

  foreach view_name in array array[
    'tournament_family_tournaments', 'tournament_family_entries',
    'tournament_family_standings', 'tournament_family_games',
    'tournament_family_game_slots', 'tournament_family_rounds',
    'tournament_family_venues', 'tournament_family_rules',
    'tournament_family_documents'
  ] loop
    if has_table_privilege('anon', 'public.' || view_name, 'select')
      or has_table_privilege('authenticated', 'public.' || view_name, 'select') then
      raise exception 'browser roles must not read %', view_name;
    end if;
    if not has_table_privilege('service_role', 'public.' || view_name, 'select') then
      raise exception 'service_role must read %', view_name;
    end if;
    if not coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = ('public.' || view_name)::regclass), false) then
      raise exception '% must be security_invoker', view_name;
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tournament_documents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%https://%'
  ) then
    raise exception 'tournament_documents must reject unsafe URLs';
  end if;
end $$;
