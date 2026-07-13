-- Per-venue weather automation settings on weather_profiles + official phone
-- for umpire SMS. Applied live 2026-07-13; mirrored here.

alter table public.weather_profiles
  add column if not exists auto_response_mode text not null default 'manual',
  add column if not exists wind_threshold_mph integer not null default 30,
  add column if not exists rain_sensitivity text not null default 'heavy_only',
  add column if not exists notify_parents boolean not null default true,
  add column if not exists notify_umpires boolean not null default false,
  add column if not exists notify_staff boolean not null default false,
  add column if not exists auto_last_triggered_at timestamptz;

alter table public.weather_profiles
  drop constraint if exists weather_profiles_auto_response_mode_check;
alter table public.weather_profiles
  add constraint weather_profiles_auto_response_mode_check
  check (auto_response_mode in ('manual','automatic'));

alter table public.weather_profiles
  drop constraint if exists weather_profiles_rain_sensitivity_check;
alter table public.weather_profiles
  add constraint weather_profiles_rain_sensitivity_check
  check (rain_sensitivity in ('heavy_only','any'));

alter table public.session_officials
  add column if not exists official_phone text;
