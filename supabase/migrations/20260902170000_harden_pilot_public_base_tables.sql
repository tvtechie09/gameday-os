-- UI/UX 1.1E pilot hardening.
--
-- Venue's public pages are server-rendered through explicit projections and
-- service-role reads. Browser roles do not need the canonical Venue tables.
-- Keeping their default Supabase grants would expose internal session notes,
-- scorekeeper credentials, staff-only announcements, and venue operations
-- fields whenever a permissive read policy is present.

revoke all privileges on table public.sessions from public, anon, authenticated;
revoke all privileges on table public.alerts from public, anon, authenticated;
revoke all privileges on table public.venues from public, anon, authenticated;
revoke all privileges on table public.field_work_orders from public, anon, authenticated;
revoke insert, update, delete on table public.fields from public, anon, authenticated;

grant select, insert, update, delete on table public.sessions to service_role;
grant select, insert, update, delete on table public.alerts to service_role;
grant select, insert, update, delete on table public.venues to service_role;
grant select, insert, update, delete on table public.field_work_orders to service_role;
grant select, insert, update, delete on table public.fields to service_role;

comment on table public.sessions is
  'Canonical schedule data. Public delivery must use server-side Venue projections; browser roles have no base-table access.';
comment on table public.alerts is
  'Canonical announcements, including staff-only content. Public delivery must use filtered server-side projections.';
