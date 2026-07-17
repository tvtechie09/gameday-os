// The identity unattended automation acts as.
//
// Created by migration 20260717030000_automation_service_account.sql: a real
// users row with auth_user_id NULL (no login path) holding the venue_automation
// role, which grants venue.field.manage and nothing else, scoped per venue.
//
// This exists because canUser() matches user_role_assignments on exact
// scope_type + scope_id with no platform escalation -- so a cron with no signed-in
// user cannot pass a venue-scoped requirePermission. The alternative was a
// permission bypass in the write path; a real bounded identity is auditable
// instead, and shows up by name in the trail.
//
// Do NOT hand this id to anything a human can trigger. Human-initiated actions
// must attribute to the human, or the audit trail lies about who closed a field.
export const automationActorUserId = "00000000-0000-4000-9000-000000000011";
