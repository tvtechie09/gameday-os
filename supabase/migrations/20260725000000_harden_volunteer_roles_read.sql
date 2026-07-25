-- Pre-launch hardening (2026-07-25). volunteer_roles carries contact PII —
-- contact_email, contact_name, contact_phone — from the public "Help Run This
-- Game" signup form. It is read ONLY through the service role (volunteer-roles.ts
-- + admin pages); no anon/public code path reads it (the field page only renders
-- the write form). But it carried a "Public can read volunteer roles USING (true)"
-- policy AND an anon SELECT grant, so the public anon key (shipped in the browser
-- bundle) could scrape every volunteer's email + phone across all venues.
--
-- Surfaced when the volunteer form was wired onto the field page — the table had
-- never been populated or audited before. Same class as the follows.email /
-- scorekeeper_token fixes. Verified: `set role anon; select ... from
-- volunteer_roles` -> permission denied; service-role reads (admin/volunteers)
-- unaffected.
drop policy if exists "Public can read volunteer roles" on public.volunteer_roles;
drop policy if exists "Allow read volunteer roles" on public.volunteer_roles;
revoke all on public.volunteer_roles from anon;
revoke all on public.volunteer_roles from authenticated;
