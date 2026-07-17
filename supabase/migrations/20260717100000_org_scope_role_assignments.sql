-- Allow organization-scoped role assignments.
--
-- The access layer already speaks scopeType 'organization' -- canViewBilling and
-- canAccessAdminWorkspace both branch on `ctx.scopeType === "organization"`, and
-- session.ts copies a role assignment's scope_type straight into ctx.scopeType.
-- But user_role_assignments' CHECK constraint never allowed 'organization', so no
-- org-scoped person could ever be persisted. The access layer was ready for an org
-- president; the persistence layer forbade one.
--
-- This is what surfaced when trying to make a real president for Illinois Celtics
-- (an org that USES fields it does not own): the app has an org concept, the DB
-- had no way to assign anyone to it.
--
-- Additive: adds 'organization' to the allowed set, changes nothing existing.

alter table user_role_assignments drop constraint if exists user_role_assignments_scope_type_check;

alter table user_role_assignments add constraint user_role_assignments_scope_type_check
  check (scope_type = any (array[
    'platform', 'tenant', 'organization', 'venue', 'field', 'play_surface',
    'tournament', 'league', 'team', 'player', 'family', 'game', 'session',
    'device', 'integration'
  ]));
