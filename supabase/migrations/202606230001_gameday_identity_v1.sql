-- GameDay Identity v1
-- Long-term role-based and scope-based access control foundation.
-- RLS is enabled without broad public policies. Server-side service-role code
-- should manage these tables until real authentication policies are added.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  display_name text,
  avatar_url text,
  user_status text not null default 'active' check (user_status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  membership_status text not null default 'active' check (membership_status in ('invited', 'active', 'suspended', 'ended')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_type text not null check (scope_type in ('platform', 'organization', 'venue', 'field', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration')),
  scope_id uuid not null,
  starts_at timestamptz,
  ends_at timestamptz,
  granted_by uuid references public.users(id),
  assignment_status text not null default 'approved' check (assignment_status in ('pending', 'approved', 'denied', 'expired', 'revoked')),
  revoked_by uuid references public.users(id),
  revoked_at timestamptz,
  approval_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.identity_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  email text not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_type text not null check (scope_type in ('platform', 'organization', 'venue', 'field', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration')),
  scope_id uuid not null,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'approved', 'denied', 'expired', 'revoked')),
  invited_by uuid references public.users(id),
  approved_by uuid references public.users(id),
  expires_at timestamptz,
  approved_at timestamptz,
  revoked_at timestamptz,
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identity_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  email text,
  requested_role_id uuid references public.roles(id),
  requested_by uuid references public.users(id),
  scope_type text not null check (scope_type in ('platform', 'organization', 'venue', 'field', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration')),
  scope_id uuid not null,
  request_status text not null default 'pending' check (request_status in ('pending', 'approved', 'denied', 'expired', 'revoked')),
  reason text,
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  revoked_by uuid references public.users(id),
  revoked_at timestamptz,
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identity_approvals (
  id uuid primary key default gen_random_uuid(),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'denied', 'expired', 'revoked')),
  approval_type text not null check (approval_type in ('invite', 'access_request', 'role_assignment')),
  invite_id uuid references public.identity_invites(id) on delete cascade,
  access_request_id uuid references public.identity_access_requests(id) on delete cascade,
  assignment_id uuid references public.user_role_assignments(id) on delete set null,
  scope_type text not null check (scope_type in ('platform', 'organization', 'venue', 'field', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration')),
  scope_id uuid not null,
  requested_by uuid references public.users(id),
  approved_by uuid references public.users(id),
  revoked_by uuid references public.users(id),
  reason text,
  approval_notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  scope_type text not null check (scope_type in ('platform', 'organization', 'venue', 'field', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration')),
  scope_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists users_auth_user_id_idx on public.users(auth_user_id);
create index if not exists users_email_idx on public.users(email);
create index if not exists roles_key_idx on public.roles(key);
create index if not exists permissions_key_idx on public.permissions(key);
create index if not exists role_permissions_role_id_idx on public.role_permissions(role_id);
create index if not exists role_permissions_permission_id_idx on public.role_permissions(permission_id);
create index if not exists organization_memberships_organization_id_idx on public.organization_memberships(organization_id);
create index if not exists organization_memberships_user_id_idx on public.organization_memberships(user_id);
create index if not exists organization_memberships_status_idx on public.organization_memberships(membership_status);
create index if not exists user_role_assignments_user_id_idx on public.user_role_assignments(user_id);
create index if not exists user_role_assignments_role_id_idx on public.user_role_assignments(role_id);
create index if not exists user_role_assignments_scope_idx on public.user_role_assignments(scope_type, scope_id);
create index if not exists user_role_assignments_active_window_idx on public.user_role_assignments(starts_at, ends_at);
create index if not exists identity_invites_email_idx on public.identity_invites(email);
create index if not exists identity_invites_scope_idx on public.identity_invites(scope_type, scope_id);
create index if not exists identity_invites_status_idx on public.identity_invites(invite_status);
create index if not exists identity_access_requests_user_id_idx on public.identity_access_requests(user_id);
create index if not exists identity_access_requests_requested_by_idx on public.identity_access_requests(requested_by);
create index if not exists identity_access_requests_scope_idx on public.identity_access_requests(scope_type, scope_id);
create index if not exists identity_access_requests_status_idx on public.identity_access_requests(request_status);
create index if not exists identity_approvals_status_idx on public.identity_approvals(approval_status);
create index if not exists identity_approvals_scope_idx on public.identity_approvals(scope_type, scope_id);
create index if not exists identity_approvals_invite_id_idx on public.identity_approvals(invite_id);
create index if not exists identity_approvals_access_request_id_idx on public.identity_approvals(access_request_id);
create index if not exists identity_approvals_assignment_id_idx on public.identity_approvals(assignment_id);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);
create index if not exists audit_logs_scope_idx on public.audit_logs(scope_type, scope_id);
create index if not exists audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.identity_invites enable row level security;
alter table public.identity_access_requests enable row level security;
alter table public.identity_approvals enable row level security;
alter table public.audit_logs enable row level security;

insert into public.roles (key, name, description)
values
  ('platform_admin', 'Platform Admin', 'Platform-level operator for GameDay OS support tasks.'),
  ('venue_director', 'Venue Director', 'Owns venue operations, staff, fields, devices, alerts, and emergency controls.'),
  ('venue_staff', 'Venue Staff', 'Supports day-to-day venue operations and alerts.'),
  ('tournament_director', 'Tournament Director', 'Owns tournament operations, schedules, brackets, delays, and score approval.'),
  ('tournament_staff', 'Tournament Staff', 'Supports tournament check-ins, games, scores, and brackets.'),
  ('league_director', 'League Director', 'Manages league schedules and team administration.'),
  ('league_staff', 'League Staff', 'Supports league schedules and teams.'),
  ('coach', 'Coach', 'Manages team, roster, lineup, invites, and assigned game controls.'),
  ('team_manager', 'Team Manager', 'Supports team operations, roster, and family invitations.'),
  ('parent', 'Parent', 'Views and manages child/team family context only.'),
  ('player', 'Player', 'Views and manages own player profile where allowed.'),
  ('fan', 'Fan', 'Follows public content and views streams.'),
  ('scorekeeper', 'Scorekeeper', 'Updates score and status for assigned game only.'),
  ('livestream_operator', 'Livestream Operator', 'Controls stream for assigned game only.'),
  ('sponsor_manager', 'Sponsor Manager', 'Manages sponsor placements and sponsor reporting inside an approved scope.'),
  ('media_operator', 'Media Operator', 'Manages approved media publishing, stream support, and public display content.'),
  ('emergency_coordinator', 'Emergency Coordinator', 'Can send emergency alerts and override venue operations inside an approved venue scope.'),
  ('audit_reviewer', 'Audit Reviewer', 'Reviews audit and compliance history inside an approved scope.'),
  ('third_party_developer', 'Third-party Developer', 'Uses approved integration permissions within a scoped organization or integration.')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

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
  ('tournament.manage', 'Manage Tournament', 'Manage tournament settings and operations.'),
  ('tournament.schedule.manage', 'Manage Tournament Schedule', 'Manage tournament schedules.'),
  ('tournament.bracket.manage', 'Manage Tournament Brackets', 'Manage tournament brackets.'),
  ('tournament.game.delay', 'Delay Tournament Games', 'Delay tournament games without controlling venue infrastructure.'),
  ('tournament.score.approve', 'Approve Tournament Scores', 'Approve tournament scores and results.'),
  ('league.manage', 'Manage League', 'Manage league settings and operations.'),
  ('league.schedule.manage', 'Manage League Schedule', 'Manage league schedules.'),
  ('league.team.manage', 'Manage League Teams', 'Manage teams within a league.'),
  ('team.manage', 'Manage Team', 'Manage team settings.'),
  ('team.roster.manage', 'Manage Team Roster', 'Manage roster records.'),
  ('team.invite.manage', 'Manage Team Invites', 'Invite parents, guardians, players, and staff.'),
  ('team.lineup.manage', 'Manage Team Lineup', 'Manage lineup and game preparation.'),
  ('game.score.update', 'Update Game Score', 'Update score and basic game state for an assigned game.'),
  ('game.stream.control', 'Control Game Stream', 'Control livestream state for an assigned game.'),
  ('game.music.control', 'Control Game Music', 'Control walk-up music workflow for an assigned game.'),
  ('game.status.update', 'Update Game Status', 'Start, delay, finalize, or update game status.'),
  ('family.child.view', 'View Child Info', 'View own child and related team information.'),
  ('family.child.manage', 'Manage Child Info', 'Manage own child profile and family context.'),
  ('player.profile.view', 'View Player Profile', 'View allowed player profile fields.'),
  ('player.profile.manage', 'Manage Player Profile', 'Manage own player profile fields.'),
  ('fan.follow', 'Follow Public Content', 'Follow public fields, teams, or games.'),
  ('fan.stream.view', 'View Public Streams', 'View available public streams.'),
  ('sponsor.manage', 'Manage Sponsors', 'Manage sponsor records, assignments, and reporting.'),
  ('media.manage', 'Manage Media', 'Manage approved media assets and media operations.'),
  ('media.publish', 'Publish Media', 'Publish approved media links or public display content.'),
  ('identity.role.manage', 'Manage Scoped Roles', 'Grant and manage role assignments inside an approved scope.'),
  ('integration.api.read', 'Read Integration API', 'Read approved integration API resources.'),
  ('integration.api.write', 'Write Integration API', 'Write approved integration API resources.'),
  ('integration.webhook.manage', 'Manage Integration Webhooks', 'Manage approved integration webhook configuration.'),
  ('audit.review', 'Review Audit Logs', 'Review audit and compliance history inside an approved scope.')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

with role_permission_map(role_key, permission_key) as (
  values
    ('platform_admin', 'venue.manage'),
    ('platform_admin', 'venue.staff.manage'),
    ('platform_admin', 'venue.field.manage'),
    ('platform_admin', 'venue.device.control'),
    ('platform_admin', 'venue.alert.send'),
    ('platform_admin', 'venue.emergency.override'),
    ('platform_admin', 'device.manage'),
    ('platform_admin', 'device.control'),
    ('platform_admin', 'tournament.manage'),
    ('platform_admin', 'tournament.schedule.manage'),
    ('platform_admin', 'tournament.bracket.manage'),
    ('platform_admin', 'tournament.game.delay'),
    ('platform_admin', 'tournament.score.approve'),
    ('platform_admin', 'league.manage'),
    ('platform_admin', 'league.schedule.manage'),
    ('platform_admin', 'league.team.manage'),
    ('platform_admin', 'team.manage'),
    ('platform_admin', 'team.roster.manage'),
    ('platform_admin', 'team.invite.manage'),
    ('platform_admin', 'team.lineup.manage'),
    ('platform_admin', 'game.score.update'),
    ('platform_admin', 'game.stream.control'),
    ('platform_admin', 'game.music.control'),
    ('platform_admin', 'game.status.update'),
    ('platform_admin', 'family.child.view'),
    ('platform_admin', 'family.child.manage'),
    ('platform_admin', 'player.profile.view'),
    ('platform_admin', 'player.profile.manage'),
    ('platform_admin', 'fan.follow'),
    ('platform_admin', 'fan.stream.view'),
    ('platform_admin', 'sponsor.manage'),
    ('platform_admin', 'media.manage'),
    ('platform_admin', 'media.publish'),
    ('platform_admin', 'identity.role.manage'),
    ('platform_admin', 'integration.api.read'),
    ('platform_admin', 'integration.api.write'),
    ('platform_admin', 'integration.webhook.manage'),
    ('platform_admin', 'audit.review'),
    ('venue_director', 'venue.manage'),
    ('venue_director', 'venue.staff.manage'),
    ('venue_director', 'venue.field.manage'),
    ('venue_director', 'venue.device.control'),
    ('venue_director', 'venue.alert.send'),
    ('venue_director', 'venue.emergency.override'),
    ('venue_director', 'device.manage'),
    ('venue_director', 'device.control'),
    ('venue_director', 'sponsor.manage'),
    ('venue_director', 'media.manage'),
    ('venue_director', 'audit.review'),
    ('venue_director', 'identity.role.manage'),
    ('venue_staff', 'venue.field.manage'),
    ('venue_staff', 'venue.alert.send'),
    ('venue_staff', 'device.control'),
    ('venue_staff', 'game.status.update'),
    ('tournament_director', 'tournament.manage'),
    ('tournament_director', 'tournament.schedule.manage'),
    ('tournament_director', 'tournament.bracket.manage'),
    ('tournament_director', 'tournament.game.delay'),
    ('tournament_director', 'tournament.score.approve'),
    ('tournament_director', 'identity.role.manage'),
    ('tournament_staff', 'tournament.bracket.manage'),
    ('tournament_staff', 'tournament.game.delay'),
    ('tournament_staff', 'tournament.score.approve'),
    ('tournament_staff', 'game.score.update'),
    ('tournament_staff', 'game.status.update'),
    ('league_director', 'league.manage'),
    ('league_director', 'league.schedule.manage'),
    ('league_director', 'league.team.manage'),
    ('league_director', 'identity.role.manage'),
    ('league_staff', 'league.schedule.manage'),
    ('league_staff', 'league.team.manage'),
    ('coach', 'team.manage'),
    ('coach', 'team.roster.manage'),
    ('coach', 'team.invite.manage'),
    ('coach', 'team.lineup.manage'),
    ('coach', 'game.score.update'),
    ('coach', 'game.status.update'),
    ('coach', 'game.music.control'),
    ('coach', 'identity.role.manage'),
    ('team_manager', 'team.manage'),
    ('team_manager', 'team.roster.manage'),
    ('team_manager', 'team.invite.manage'),
    ('parent', 'family.child.view'),
    ('parent', 'family.child.manage'),
    ('player', 'player.profile.view'),
    ('player', 'player.profile.manage'),
    ('fan', 'fan.follow'),
    ('fan', 'fan.stream.view'),
    ('scorekeeper', 'game.score.update'),
    ('scorekeeper', 'game.status.update'),
    ('livestream_operator', 'game.stream.control'),
    ('livestream_operator', 'media.publish'),
    ('sponsor_manager', 'sponsor.manage'),
    ('media_operator', 'game.stream.control'),
    ('media_operator', 'media.manage'),
    ('media_operator', 'media.publish'),
    ('emergency_coordinator', 'venue.alert.send'),
    ('emergency_coordinator', 'venue.emergency.override'),
    ('emergency_coordinator', 'device.control'),
    ('audit_reviewer', 'audit.review'),
    ('third_party_developer', 'integration.api.read'),
    ('third_party_developer', 'integration.api.write'),
    ('third_party_developer', 'integration.webhook.manage')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from role_permission_map
join public.roles on roles.key = role_permission_map.role_key
join public.permissions on permissions.key = role_permission_map.permission_key
on conflict (role_id, permission_id) do nothing;
