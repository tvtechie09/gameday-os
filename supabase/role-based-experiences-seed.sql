-- Role-based experiences seed (additive, idempotent).
--
-- Creates the five demo users used by the dev-login / impersonation path and
-- maps each to a REAL role via public.user_role_assignments, so capability
-- checks in the app are genuine (backed by role_permissions). Also adds the
-- additive venue_tech_manager role and the two extra permissions the redesign
-- grants the Venue GM (venue_director) for Today's Operations quick actions.
--
-- Safe to run repeatedly: every statement is upsert / on-conflict guarded.
-- Depends on: 202606230001_gameday_identity_v1.sql (identity catalog) and
--             202606220002_schema_audit_catch_up.sql (venues, tournaments).

begin;

-- 1) Additive role: Venue Tech Manager -------------------------------------
insert into public.roles (key, name, description)
values (
  'venue_tech_manager',
  'Venue Tech Manager',
  'Owns venue devices, scoreboards, cameras, and field technical operations. No billing, users, permissions, or global settings.'
)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

-- 2) Role -> permission grants (additive) -----------------------------------
--    venue_tech_manager gets its device/field operations permissions, and
--    venue_director gains game.status.update + tournament.game.delay so a
--    Venue GM can start/delay games from Today's Operations.
with desired(role_key, permission_key) as (
  values
    ('venue_tech_manager', 'venue.device.control'),
    ('venue_tech_manager', 'device.manage'),
    ('venue_tech_manager', 'device.control'),
    ('venue_tech_manager', 'venue.field.manage'),
    ('venue_tech_manager', 'game.status.update'),
    ('venue_director', 'game.status.update'),
    ('venue_director', 'tournament.game.delay')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from desired d
join public.roles r on r.key = d.role_key
join public.permissions p on p.key = d.permission_key
on conflict (role_id, permission_id) do nothing;

-- 3) Flagship tournament (idempotent by name) -------------------------------
--    The venue already comes from the canonical Crossroads seed. Do not create
--    a second empty venue here: role assignments below resolve the populated
--    Wintrust venue by relationship and fail fast if it is unavailable.

insert into public.tournaments (name, description, start_date, end_date)
select 'Crossroads Summer Classic', 'Demo tournament scope for the Tournament Director experience.', current_date, current_date + interval '2 days'
where not exists (select 1 from public.tournaments where name = 'Crossroads Summer Classic');

-- 4) Demo users (deterministic UUIDs matching src/lib/access/demo-users.ts) --
insert into public.users (id, email, display_name, user_status)
values
  ('11111111-1111-4111-8111-111111111111', 'platform.admin@gamedayos.test', 'Platform Admin', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'crossroads.gm@gamedayos.test', 'Crossroads GM', 'active'),
  ('33333333-3333-4333-8333-333333333333', 'crossroads.staff@gamedayos.test', 'Crossroads Staff', 'active'),
  ('44444444-4444-4444-8444-444444444444', 'crossroads.tech@gamedayos.test', 'Crossroads Tech Manager', 'active'),
  ('55555555-5555-4555-8555-555555555555', 'tournament.director@gamedayos.test', 'Tournament Director', 'active')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    user_status = excluded.user_status;

-- 5) Role assignments (real user_role_assignments rows) ----------------------
--    Resolve venue/tournament scope ids by name; platform uses the all-zero
--    sentinel. Re-runnable: we delete this demo cohort's assignments first,
--    then re-insert, so scope/role edits converge without duplicates.
do $$
declare
  v_venue_id uuid;
  v_tournament_id uuid;
  v_platform uuid := '00000000-0000-0000-0000-000000000000';
  demo_user_ids uuid[] := array[
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  ]::uuid[];
begin
  select id into strict v_venue_id
  from public.venues
  where name = 'Wintrust Crossroads Sports Complex';
  select id into v_tournament_id from public.tournaments where name = 'Crossroads Summer Classic' limit 1;

  delete from public.user_role_assignments where user_id = any(demo_user_ids);

  insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, assignment_status)
  select u.user_id, r.id, u.scope_type, u.scope_id, 'approved'
  from (
    values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'platform_admin',      'platform',   v_platform),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'venue_director',      'venue',      v_venue_id),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'venue_staff',         'venue',      v_venue_id),
      ('44444444-4444-4444-8444-444444444444'::uuid, 'venue_tech_manager',  'venue',      v_venue_id),
      ('55555555-5555-4555-8555-555555555555'::uuid, 'tournament_director', 'tournament', coalesce(v_tournament_id, v_platform))
  ) as u(user_id, role_key, scope_type, scope_id)
  join public.roles r on r.key = u.role_key
  where u.scope_id is not null;
end $$;

commit;
