-- Per-venue timezone.
--
-- Every venue-local calculation in the app (the "today" date boundary, delay
-- math, Schedule Pulse, the end-of-day report, reservation slot windows) was
-- computed in a hardcoded America/Chicago. That is invisible and correct for the
-- Chicagoland founding cohort and pervasively wrong for anyone else: day
-- boundaries roll at the wrong hour, so an evening game can vanish from "today",
-- and every displayed time is off by one to three hours.
--
-- Additive and backward compatible: existing rows keep Central Time via the
-- default, so nothing changes for current customers until a venue is set
-- otherwise.
--
-- The filename version is the one the production ledger recorded when this was
-- applied (2026-08-01), so repo and ledger agree and it is not applied twice.
-- It was originally 20260729000000, which collided with
-- 20260729000000_org_prohibited_sponsor_categories.sql on main — Supabase keys
-- the ledger on version, so one of the two would have been silently skipped on
-- a rebuild, leaving a database missing a column.

alter table public.venues
  add column if not exists timezone text not null default 'America/Chicago';

comment on column public.venues.timezone is
  'IANA timezone name (e.g. America/Chicago, America/New_York). Every venue-local date and time in the app is computed in this zone.';

-- Reject a value the app cannot format with. A bad timezone here would silently
-- fall back at render time and misreport the venue''s own operating day.
alter table public.venues
  drop constraint if exists venues_timezone_valid;

alter table public.venues
  add constraint venues_timezone_valid
  check (timezone ~ '^[A-Za-z][A-Za-z0-9+_-]*(/[A-Za-z0-9+_-]+)+$');
