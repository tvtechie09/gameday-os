-- Staging Schema Reconciliation 1.0A: logical asset health.
--
-- connection_health, last_seen_at, edge_device_id, and the health constraint
-- already exist in staging. Add only the current service's missing fields and
-- indexes. No asset-health data is synthesized or normalized here.

alter table public.venue_assets
  add column health_message text,
  add column diagnostic_summary jsonb not null default '{}'::jsonb;

create index venue_assets_connection_health_idx
  on public.venue_assets (venue_id, connection_health, last_seen_at desc);
create unique index venue_assets_edge_device_unique
  on public.venue_assets (venue_id, edge_device_id)
  where edge_device_id is not null;

alter table public.venue_assets enable row level security;
revoke all privileges on table public.venue_assets from public, anon, authenticated;
grant select, insert, update, delete on table public.venue_assets to service_role;
