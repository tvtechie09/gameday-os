-- Give organizations the branding columns the app has always written.
--
-- The admin "New organization" form collects a banner, two brand colours, a
-- website, and a description. createOrganization() and updateOrganization()
-- insert all five straight into public.organizations -- but the columns were
-- never created, so BOTH writes fail outright. Creating an organization through
-- the admin UI has been broken.
--
-- It stayed hidden because the READ path already works around it:
-- getOrganizations() catches the missing-column error and retries with
-- organizationSelectWithoutBranding. Listing organizations therefore degrades
-- silently to un-branded rows, which looks like "branding was never filled in"
-- rather than "the schema is missing". The write paths have no such fallback.
--
-- Originally written 2026-07-08 on the branch fix/venue-fields-schema-drift and
-- never merged. Its `fields` and `sessions` half DID reach production; only the
-- organizations half was left behind. This applies the remainder.
--
-- Additive and nullable: no existing row changes, no rewrite, no lock beyond a
-- brief catalogue update.
--
-- Schema-qualified on purpose: Supabase's pooled connections run with an EMPTY
-- search_path, so unqualified names resolve to nothing when this is applied by
-- script rather than through the SQL editor.
set search_path = public, extensions;

alter table public.organizations add column if not exists banner_url text;
alter table public.organizations add column if not exists primary_color text;
alter table public.organizations add column if not exists secondary_color text;
alter table public.organizations add column if not exists website_url text;
alter table public.organizations add column if not exists description text;

comment on column public.organizations.banner_url is
  'URL of the organization banner image. Mirrors public.venues.banner_url.';
comment on column public.organizations.primary_color is
  'Primary brand colour (hex string). Mirrors public.venues.primary_color.';
comment on column public.organizations.secondary_color is
  'Secondary brand colour (hex string). Mirrors public.venues.secondary_color.';
comment on column public.organizations.website_url is
  'Public website URL for the organization. Mirrors public.venues.website_url.';
comment on column public.organizations.description is
  'Short public description of the organization. Mirrors public.venues.description.';
