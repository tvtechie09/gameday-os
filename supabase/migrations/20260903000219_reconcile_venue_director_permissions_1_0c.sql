-- Staging Access Reconciliation 1.0C
-- Restore the canonical Venue GM capability contract used by the application.
-- This is additive: legacy role permissions remain intact, and user assignments
-- are not changed.

insert into public.permissions (key, name, description)
values
  ('venue.manage', 'Manage Venue', 'Manage venue settings and operating state.'),
  ('venue.staff.manage', 'Manage Venue Staff', 'Invite and manage venue staff assignments.'),
  ('venue.field.manage', 'Manage Venue Fields', 'Create and manage venue fields and field status.'),
  ('venue.device.control', 'Control Venue Devices', 'Control venue devices and infrastructure where integrations exist.'),
  ('venue.alert.send', 'Send Venue Alerts', 'Create and clear venue public operations alerts.'),
  ('venue.emergency.override', 'Emergency Override', 'Override normal venue operations during emergencies.'),
  ('device.manage', 'Manage Device', 'Configure devices and device assignments.'),
  ('device.control', 'Control Device', 'Operate an approved field or venue device.'),
  ('sponsor.manage', 'Manage Sponsors', 'Manage sponsor records, assignments, and reporting.'),
  ('media.manage', 'Manage Media', 'Manage approved media assets and media operations.'),
  ('audit.review', 'Review Audit Logs', 'Review audit and compliance history inside an approved scope.'),
  ('identity.role.manage', 'Manage Scoped Roles', 'Grant and manage role assignments inside an approved scope.'),
  ('game.status.update', 'Update Game Status', 'Start, delay, finalize, or update game status.'),
  ('tournament.game.delay', 'Delay Tournament Games', 'Delay tournament games without controlling venue infrastructure.')
on conflict (key) do nothing;

with director_permission_map(permission_key) as (
  values
    ('venue.manage'),
    ('venue.staff.manage'),
    ('venue.field.manage'),
    ('venue.device.control'),
    ('venue.alert.send'),
    ('venue.emergency.override'),
    ('device.manage'),
    ('device.control'),
    ('sponsor.manage'),
    ('media.manage'),
    ('audit.review'),
    ('identity.role.manage'),
    ('game.status.update'),
    ('tournament.game.delay')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from director_permission_map
join public.roles on roles.key = 'venue_director'
join public.permissions on permissions.key = director_permission_map.permission_key
on conflict (role_id, permission_id) do nothing;
