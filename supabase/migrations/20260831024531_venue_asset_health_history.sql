-- Measured device reliability for management reporting. This records logical
-- asset health transitions; it does not expose Edge transport details or keys.

create table if not exists public.venue_asset_health_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  asset_id uuid not null references public.venue_assets(id) on delete cascade,
  connection_health text not null check (connection_health in ('not_configured', 'online', 'degraded', 'offline', 'unknown')),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists venue_asset_health_events_venue_observed_idx
  on public.venue_asset_health_events (venue_id, observed_at desc);
create index if not exists venue_asset_health_events_asset_observed_idx
  on public.venue_asset_health_events (asset_id, observed_at desc);

alter table public.venue_asset_health_events enable row level security;
revoke all on table public.venue_asset_health_events from anon, authenticated;
grant select, insert, update, delete on table public.venue_asset_health_events to service_role;

create or replace function public.record_venue_asset_health_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or old.connection_health is distinct from new.connection_health then
    insert into public.venue_asset_health_events (
      organization_id,
      venue_id,
      asset_id,
      connection_health,
      observed_at
    ) values (
      new.organization_id,
      new.venue_id,
      new.id,
      new.connection_health,
      coalesce(new.last_seen_at, now())
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_venue_asset_health_transition() from public, anon, authenticated;
grant execute on function public.record_venue_asset_health_transition() to service_role;

drop trigger if exists venue_assets_record_health_transition on public.venue_assets;
create trigger venue_assets_record_health_transition
after insert or update of connection_health on public.venue_assets
for each row execute function public.record_venue_asset_health_transition();

-- Establish an honest baseline at rollout time. Reports do not extrapolate
-- health before this event.
insert into public.venue_asset_health_events (
  organization_id,
  venue_id,
  asset_id,
  connection_health,
  observed_at
)
select
  asset.organization_id,
  asset.venue_id,
  asset.id,
  asset.connection_health,
  now()
from public.venue_assets asset
where not exists (
  select 1 from public.venue_asset_health_events event
  where event.asset_id = asset.id
);
