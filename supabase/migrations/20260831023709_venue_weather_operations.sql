create table if not exists public.venue_weather_operations (
  venue_id uuid primary key references public.venues(id) on delete cascade,
  status text not null default 'normal' check (status in ('normal', 'monitoring', 'hold', 'evacuating', 'restart_countdown', 'all_clear')),
  message text not null default '',
  affected_field_ids uuid[] not null default '{}',
  restart_not_before timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venue_weather_operations enable row level security;
revoke all on public.venue_weather_operations from anon, authenticated;
grant select, insert, update, delete on public.venue_weather_operations to service_role;
