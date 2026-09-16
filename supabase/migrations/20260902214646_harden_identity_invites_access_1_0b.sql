-- Staging Access Reconciliation 1.0B
-- Identity invitation reads and writes are performed by the trusted server
-- through getSupabaseAdminClient(). Browser roles do not require direct access
-- to this base table; RLS remains enabled as defense in depth.

revoke all privileges on table public.identity_invites from anon, authenticated;

grant select, insert, update, delete on table public.identity_invites to service_role;
