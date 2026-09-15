-- GameDay Venue Operations Sprint 1
--
-- Evolve the existing field_work_orders table into the single accountable
-- operational-issue record used by the Command Center. This is additive and
-- preserves existing work-order links while allowing venue-wide exceptions
-- such as weather or network outages.

alter table public.field_work_orders
  add column if not exists venue_id uuid references public.venues(id) on delete cascade,
  add column if not exists issue_type text not null default 'maintenance',
  add column if not exists system_key text,
  add column if not exists detected_at timestamptz not null default now(),
  add column if not exists assigned_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Existing records inherit their venue from their field before venue_id
-- becomes required. A venue is the security and reporting boundary; field_id
-- is now optional so facility-wide issues can use the same lifecycle.
update public.field_work_orders issue
set venue_id = field.venue_id
from public.fields field
where issue.field_id = field.id
  and issue.venue_id is null;

alter table public.field_work_orders
  alter column venue_id set not null,
  alter column field_id drop not null;

-- Promote legacy derived states into the explicit operating lifecycle while
-- accepting "done" during a rolling deploy. New application writes use
-- open -> assigned -> acknowledged -> in_progress -> resolved.
update public.field_work_orders
set status = case
  when status = 'done' or closed_at is not null then 'resolved'
  when status = 'in_progress' then 'in_progress'
  when acknowledged_at is not null then 'acknowledged'
  when assigned_to_user_id is not null or assigned_role is not null then 'assigned'
  else 'open'
end;

alter table public.field_work_orders
  drop constraint if exists field_work_orders_status_check,
  add constraint field_work_orders_status_check
    check (status in ('open', 'assigned', 'acknowledged', 'in_progress', 'resolved', 'done')),
  drop constraint if exists field_work_orders_issue_type_check,
  add constraint field_work_orders_issue_type_check
    check (issue_type in ('maintenance', 'schedule', 'staffing', 'device', 'scoreboard', 'audio', 'camera', 'weather', 'incident', 'task', 'other'));

create index if not exists field_work_orders_venue_status_idx
  on public.field_work_orders (venue_id, status, created_at desc);
create index if not exists field_work_orders_game_idx
  on public.field_work_orders (game_id) where game_id is not null;
create index if not exists field_work_orders_asset_idx
  on public.field_work_orders (asset_id) where asset_id is not null;
create unique index if not exists field_work_orders_open_system_key_unique
  on public.field_work_orders (venue_id, system_key)
  where system_key is not null and status not in ('resolved', 'done');

alter table public.field_work_orders enable row level security;
revoke all on public.field_work_orders from anon, authenticated;
grant select, insert, update, delete on public.field_work_orders to service_role;
