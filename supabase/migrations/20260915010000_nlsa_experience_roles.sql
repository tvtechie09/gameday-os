-- NLSA soccer demo: reconcile the four least-privilege experience roles used
-- by normal hosted Auth. Additive only; no existing grant is removed.

-- Keep the synthetic demo self-contained on a freshly bootstrapped database.
-- These presentation fields previously existed only in the hosted environment,
-- so the following seed depended on unrecorded schema drift.
alter table public.venues add column if not exists entrance_note text;
alter table public.venues add column if not exists restroom_note text;
alter table public.venues add column if not exists concession_note text;
alter table public.venues add column if not exists emergency_information text;
alter table public.venues add column if not exists public_status text not null default 'open';
alter table public.venues add column if not exists public_status_message text;

alter table public.fields add column if not exists parent_visible boolean not null default true;
alter table public.fields add column if not exists public_description text;
alter table public.fields add column if not exists sort_order integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'venues_public_status_check'
  ) then
    alter table public.venues
      add constraint venues_public_status_check
      check (public_status in ('open', 'delayed', 'closed'));
  end if;
end $$;

insert into public.roles (key, name, description)
values
  ('organization_admin', 'Organization Owner', 'Views and manages one organization within an explicitly assigned scope.'),
  ('league_staff', 'League Staff', 'Supports league schedules and teams within an explicitly assigned scope.'),
  ('coach', 'Coach', 'Views and manages an explicitly assigned team context.'),
  ('parent', 'Parent / Guardian', 'Views approved family and child context only.')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.permissions (key, name, description)
values
  ('league.manage', 'Manage League', 'Manage league settings and operations.'),
  ('league.schedule.manage', 'Manage League Schedule', 'Manage league schedules.'),
  ('league.team.manage', 'Manage League Teams', 'Manage teams within a league.'),
  ('team.manage', 'Manage Team', 'Manage an explicitly assigned team.'),
  ('family.child.view', 'View Child Info', 'View approved child and related team information.'),
  ('identity.review', 'Review Identity', 'Review identity evidence within an approved scope.'),
  ('audit.review', 'Review Audit Logs', 'Review audit and compliance history inside an approved scope.')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

with role_permission_map(role_key, permission_key) as (
  values
    ('organization_admin', 'league.manage'),
    ('organization_admin', 'league.schedule.manage'),
    ('organization_admin', 'league.team.manage'),
    ('organization_admin', 'identity.review'),
    ('organization_admin', 'audit.review'),
    ('league_staff', 'league.schedule.manage'),
    ('league_staff', 'league.team.manage'),
    ('coach', 'team.manage'),
    ('parent', 'family.child.view')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_map rpm
join public.roles r on r.key = rpm.role_key
join public.permissions p on p.key = rpm.permission_key
on conflict (role_id, permission_id) do nothing;
