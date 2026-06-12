alter table public.venues
  add column if not exists logo_url text,
  add column if not exists banner_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text;

update public.venues
set
  logo_url = nullif(btrim(logo_url), ''),
  banner_url = nullif(btrim(banner_url), ''),
  primary_color = nullif(btrim(primary_color), ''),
  secondary_color = nullif(btrim(secondary_color), '');
