alter table public.organizations
  add column if not exists banner_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists website_url text,
  add column if not exists description text;
