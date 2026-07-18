-- Pre-launch hardening (2026-07-18 security audit). venue_assets is read ONLY
-- through the service role (venue-assets.ts + the command-center service); no
-- anon/public code path touches it. But it carried a "Public can read venue
-- assets USING (true)" policy that would expose device ip_address / serial_number
-- to anyone with the anon key the moment a real venue enters them. Closed before
-- onboarding real venues. Verified: service-role reads (Command Center's device
-- checklist) are unaffected.
drop policy if exists "Public can read venue assets" on public.venue_assets;
revoke select on public.venue_assets from anon;
revoke select on public.venue_assets from authenticated;
