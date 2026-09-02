-- Staging Schema Reconciliation 1.0A: operational Work Orders.
--
-- Staging has the base and lifecycle schema but not the current venue-scoped
-- operational delta. Existing rows are resolved to their field's venue before
-- venue_id becomes required; the precondition fails instead of fabricating an
-- identifier when a row cannot be reconciled.

alter table public.field_work_orders
  add column venue_id uuid references public.venues(id) on delete cascade,
  add column issue_type text not null default 'maintenance',
  add column system_key text,
  add column detected_at timestamptz not null default now(),
  add column assigned_at timestamptz,
  add column started_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb;

update public.field_work_orders issue
set venue_id = field.venue_id
from public.fields field
where issue.field_id = field.id
  and issue.venue_id is null;

do $$
begin
  if exists (
    select 1
    from public.field_work_orders
    where venue_id is null
  ) then
    raise exception 'Cannot reconcile field_work_orders.venue_id without a canonical field venue';
  end if;
end
$$;

alter table public.field_work_orders
  alter column venue_id set not null,
  alter column field_id drop not null,
  add constraint field_work_orders_status_check
    check (status in ('open', 'assigned', 'acknowledged', 'in_progress', 'resolved', 'done')),
  add constraint field_work_orders_issue_type_check
    check (issue_type in ('maintenance', 'schedule', 'staffing', 'device', 'scoreboard', 'audio', 'camera', 'weather', 'incident', 'task', 'other'));

create index field_work_orders_venue_status_idx
  on public.field_work_orders (venue_id, status, created_at desc);
create index field_work_orders_game_idx
  on public.field_work_orders (game_id)
  where game_id is not null;
create index field_work_orders_asset_idx
  on public.field_work_orders (asset_id)
  where asset_id is not null;
create unique index field_work_orders_open_system_key_unique
  on public.field_work_orders (venue_id, system_key)
  where system_key is not null and status not in ('resolved', 'done');

alter table public.field_work_orders enable row level security;
revoke all privileges on table public.field_work_orders from public, anon, authenticated;
grant select, insert, update, delete on table public.field_work_orders to service_role;
