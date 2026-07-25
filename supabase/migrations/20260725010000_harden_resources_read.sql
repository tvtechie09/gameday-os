-- Pre-launch hardening (2026-07-25). resources (device inventory) exposed
-- serial_number / manufacturer / model / notes to the anon key via a
-- "Public can read resources USING (true)" policy + anon SELECT grant — device
-- fingerprinting / info disclosure once real venues enter hardware. Read path is
-- service-role only (resources.ts + admin pages; the public venues/[id] page also
-- reads via the service role), so locking is safe and invisible to the app.
-- Verified: `set role anon; select from resources` -> permission denied; public
-- venue page renders unchanged.
drop policy if exists "Public can read resources" on public.resources;
drop policy if exists "Allow read resources" on public.resources;
revoke all on public.resources from anon;
revoke all on public.resources from authenticated;
