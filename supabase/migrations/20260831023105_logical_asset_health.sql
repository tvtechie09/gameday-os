-- Human-facing health for canonical logical venue assets. Edge/vendor details
-- remain infrastructure and support diagnostics, not required operator input.

alter table public.venue_assets
  add column if not exists connection_health text not null default 'unknown',
  add column if not exists last_seen_at timestamptz,
  add column if not exists health_message text,
  add column if not exists edge_device_id text,
  add column if not exists diagnostic_summary jsonb not null default '{}'::jsonb;

alter table public.venue_assets
  drop constraint if exists venue_assets_connection_health_check,
  add constraint venue_assets_connection_health_check
    check (connection_health in ('not_configured', 'online', 'degraded', 'offline', 'unknown'));

update public.venue_assets
set connection_health = case
  when status = 'offline' then 'offline'
  when status = 'maintenance_needed' then 'degraded'
  when status = 'healthy' and integration_status = 'connected' then 'online'
  when integration_status = 'not_configured' then 'not_configured'
  else 'unknown'
end
where connection_health = 'unknown';

create index if not exists venue_assets_connection_health_idx
  on public.venue_assets (venue_id, connection_health, last_seen_at desc);
create unique index if not exists venue_assets_edge_device_unique
  on public.venue_assets (venue_id, edge_device_id)
  where edge_device_id is not null;

-- venue_assets is already RLS-enabled and service-role-only. Repeat the grants
-- here so this migration remains deny-by-default if applied to a drifted stack.
alter table public.venue_assets enable row level security;
revoke all on public.venue_assets from anon, authenticated;
grant select, insert, update, delete on public.venue_assets to service_role;
