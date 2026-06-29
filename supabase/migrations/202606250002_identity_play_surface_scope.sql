-- GameDay Identity: allow permissions to be scoped to a configured play surface.
-- This keeps venue, parent field, and play-surface permissions exact instead of implied globally.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_role_assignments_scope_type_check') then
    alter table public.user_role_assignments drop constraint user_role_assignments_scope_type_check;
  end if;

  alter table public.user_role_assignments
    add constraint user_role_assignments_scope_type_check
    check (scope_type in ('platform', 'organization', 'venue', 'field', 'play_surface', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration'));

  if exists (select 1 from pg_constraint where conname = 'identity_invites_scope_type_check') then
    alter table public.identity_invites drop constraint identity_invites_scope_type_check;
  end if;

  alter table public.identity_invites
    add constraint identity_invites_scope_type_check
    check (scope_type in ('platform', 'organization', 'venue', 'field', 'play_surface', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration'));

  if exists (select 1 from pg_constraint where conname = 'identity_access_requests_scope_type_check') then
    alter table public.identity_access_requests drop constraint identity_access_requests_scope_type_check;
  end if;

  alter table public.identity_access_requests
    add constraint identity_access_requests_scope_type_check
    check (scope_type in ('platform', 'organization', 'venue', 'field', 'play_surface', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration'));

  if exists (select 1 from pg_constraint where conname = 'identity_approvals_scope_type_check') then
    alter table public.identity_approvals drop constraint identity_approvals_scope_type_check;
  end if;

  alter table public.identity_approvals
    add constraint identity_approvals_scope_type_check
    check (scope_type in ('platform', 'organization', 'venue', 'field', 'play_surface', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration'));

  if exists (select 1 from pg_constraint where conname = 'audit_logs_scope_type_check') then
    alter table public.audit_logs drop constraint audit_logs_scope_type_check;
  end if;

  alter table public.audit_logs
    add constraint audit_logs_scope_type_check
    check (scope_type in ('platform', 'organization', 'venue', 'field', 'play_surface', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration'));
end $$;
