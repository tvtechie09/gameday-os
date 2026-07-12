-- Announcement delivery: followers can leave an email; alert creation fans
-- out delivery records (sent via provider when configured).
-- Applied to the shared GameDay OS Supabase project on 2026-07-12.
alter table public.follows add column if not exists email text;

create table if not exists public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  follow_id uuid references public.follows(id) on delete set null,
  email text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped_no_provider')),
  provider text not null default '',
  error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists alert_deliveries_alert_id_idx on public.alert_deliveries(alert_id);

alter table public.alert_deliveries enable row level security;
revoke all on table public.alert_deliveries from anon, authenticated;
grant select, insert, update on table public.alert_deliveries to service_role;
