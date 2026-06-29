-- GameDay Identity seed assignments for local verification.
-- Run after supabase/migrations/202606230001_gameday_identity_v1.sql.
-- These rows use fake user/scope ids so permission checks can be exercised before auth is wired.

insert into public.users (id, email, display_name, user_status)
values
  ('00000000-0000-0000-0000-000000000100', 'platform-admin@example.com', 'Platform Admin Seed', 'active'),
  ('00000000-0000-0000-0000-000000000101', 'venue-director@example.com', 'Venue Director Seed', 'active'),
  ('00000000-0000-0000-0000-000000000102', 'tournament-director@example.com', 'Tournament Director Seed', 'active'),
  ('00000000-0000-0000-0000-000000000103', 'scorekeeper@example.com', 'Scorekeeper Seed', 'active'),
  ('00000000-0000-0000-0000-000000000104', 'parent@example.com', 'Parent Seed', 'active'),
  ('00000000-0000-0000-0000-000000000105', 'livestream@example.com', 'Livestream Operator Seed', 'active'),
  ('00000000-0000-0000-0000-000000000106', 'fan@example.com', 'Fan Seed', 'active'),
  ('00000000-0000-0000-0000-000000000107', 'expired-scorekeeper@example.com', 'Expired Scorekeeper Seed', 'active'),
  ('00000000-0000-0000-0000-000000000108', 'emergency@example.com', 'Emergency Coordinator Seed', 'active'),
  ('00000000-0000-0000-0000-000000000109', 'developer@example.com', 'Third-party Developer Seed', 'active')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    user_status = excluded.user_status,
    updated_at = now();

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000101', roles.id, 'venue', '00000000-0000-0000-0000-00000000a001', now(), null, null
from public.roles
where roles.key = 'venue_director';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000100', roles.id, 'platform', '00000000-0000-0000-0000-00000000f001', now(), null, null
from public.roles
where roles.key = 'platform_admin';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000102', roles.id, 'tournament', '00000000-0000-0000-0000-00000000b001', now(), null, null
from public.roles
where roles.key = 'tournament_director';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000103', roles.id, 'session', '00000000-0000-0000-0000-00000000c001', now(), now() + interval '4 hours', null
from public.roles
where roles.key = 'scorekeeper';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000104', roles.id, 'family', '00000000-0000-0000-0000-00000000d001', now(), null, null
from public.roles
where roles.key = 'parent';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000105', roles.id, 'session', '00000000-0000-0000-0000-00000000c001', now(), now() + interval '4 hours', null
from public.roles
where roles.key = 'livestream_operator';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000106', roles.id, 'organization', '00000000-0000-0000-0000-00000000e001', now(), null, null
from public.roles
where roles.key = 'fan';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000108', roles.id, 'venue', '00000000-0000-0000-0000-00000000a001', now(), null, null
from public.roles
where roles.key = 'emergency_coordinator';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000109', roles.id, 'integration', '00000000-0000-0000-0000-00000000e999', now(), null, null
from public.roles
where roles.key = 'third_party_developer';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, starts_at, ends_at, granted_by)
select '00000000-0000-0000-0000-000000000107', roles.id, 'session', '00000000-0000-0000-0000-00000000c001', now() - interval '2 days', now() - interval '1 day', null
from public.roles
where roles.key = 'scorekeeper';

with invite_insert as (
  insert into public.identity_invites (email, role_id, scope_type, scope_id, invite_status, invited_by, expires_at, approval_notes)
  select 'new-staff@example.com', roles.id, 'venue', '00000000-0000-0000-0000-00000000a001', 'pending', '00000000-0000-0000-0000-000000000101', now() + interval '7 days', 'Seed invite for venue staff access.'
  from public.roles
  where roles.key = 'venue_staff'
  returning id, scope_type, scope_id, invited_by, approval_notes
)
insert into public.identity_approvals (approval_status, approval_type, invite_id, scope_type, scope_id, requested_by, approval_notes)
select 'pending', 'invite', id, scope_type, scope_id, invited_by, approval_notes
from invite_insert;

with request_insert as (
  insert into public.identity_access_requests (email, requested_role_id, requested_by, scope_type, scope_id, request_status, reason)
  select 'volunteer-scorekeeper@example.com', roles.id, '00000000-0000-0000-0000-000000000103', 'session', '00000000-0000-0000-0000-00000000c001', 'pending', 'Volunteer requested scorekeeper access for game day.'
  from public.roles
  where roles.key = 'scorekeeper'
  returning id, scope_type, scope_id, requested_by, reason
)
insert into public.identity_approvals (approval_status, approval_type, access_request_id, scope_type, scope_id, requested_by, reason)
select 'pending', 'access_request', id, scope_type, scope_id, requested_by, reason
from request_insert;
