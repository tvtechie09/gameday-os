-- Automation service account for unattended storm response.
--
-- WHY: executeStormResponse holds fields by calling updateFieldStatus, which runs
-- assertActorUserId + a venue-scoped requirePermission. The weather cron has no
-- signed-in user, so every hold threw PermissionDeniedError and was swallowed --
-- fieldsHeld was always 0. Lightning overhead, fields still reading OPEN on the
-- public field pages and the wall display.
--
-- canUser() matches user_role_assignments on exact scope_type + scope_id and has
-- no platform-level escalation, so a platform-scoped actor cannot satisfy a
-- venue-scoped check. The automation therefore needs real venue-scoped grants.
--
-- DESIGN: a real, auditable identity rather than a permission bypass.
--   * auth_user_id IS NULL  -> the account can never be signed into.
--   * venue_automation role -> holds venue.field.manage and NOTHING else.
--   * one assignment per venue, so the automation is bounded by the same tenant
--     rules as any human and shows up in the audit trail by name.
--
-- Idempotent: safe to re-run.

-- 1. The role: least privilege, exactly one permission.
insert into roles (id, key, name, description)
values (
  '00000000-0000-4000-9000-000000000010',
  'venue_automation',
  'Venue Automation',
  'Non-human service role for unattended venue automation (storm holds). Grants venue.field.manage only.'
)
on conflict (key) do nothing;

-- 2. Grant it venue.field.manage, and only that.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key = 'venue.field.manage'
where r.key = 'venue_automation'
on conflict do nothing;

-- 3. The identity. auth_user_id NULL => no login path exists for this account.
insert into users (id, auth_user_id, email, display_name, user_status)
values (
  '00000000-0000-4000-9000-000000000011',
  null,
  'automation@gamedayos.internal',
  'GameDay Automation',
  'active'
)
on conflict (id) do nothing;

-- 4. Venue-scoped assignments, one per venue. Re-run after adding a venue.
insert into user_role_assignments (user_id, role_id, scope_type, scope_id, assignment_status, approval_notes)
select
  '00000000-0000-4000-9000-000000000011',
  (select id from roles where key = 'venue_automation'),
  'venue',
  v.id,
  'approved',
  'Automated storm response (weather cron). Created by migration 20260717030000.'
from venues v
where not exists (
  select 1 from user_role_assignments ura
  where ura.user_id = '00000000-0000-4000-9000-000000000011'
    and ura.scope_type = 'venue'
    and ura.scope_id = v.id
);
