-- Staging Access Reconciliation 1.0B
-- Restore only the canonical frontline Venue Staff role contract already
-- enforced by src/lib/access/catalog.ts. User assignments are intentionally
-- excluded from this static catalog migration.

insert into public.roles (key, name, description)
values (
  'venue_staff',
  'Venue Staff',
  'Supports day-to-day venue operations and alerts.'
)
on conflict (key) do nothing;

insert into public.permissions (key, name, description)
values
  ('venue.field.manage', 'Manage Venue Fields', 'Create and manage venue fields and field status.'),
  ('venue.alert.send', 'Send Venue Alerts', 'Create and clear venue public operations alerts.'),
  ('device.control', 'Control Device', 'Operate an approved field or venue device.'),
  ('game.status.update', 'Update Game Status', 'Start, delay, finalize, or update game status.')
on conflict (key) do nothing;

with staff_permission_map(permission_key) as (
  values
    ('venue.field.manage'),
    ('venue.alert.send'),
    ('device.control'),
    ('game.status.update')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from staff_permission_map
join public.roles on roles.key = 'venue_staff'
join public.permissions on permissions.key = staff_permission_map.permission_key
on conflict (role_id, permission_id) do nothing;
