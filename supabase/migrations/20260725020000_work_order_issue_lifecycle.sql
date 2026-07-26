-- Durable issue lifecycle on field_work_orders (2026-07-25).
--
-- The Command Center attention queue is COMPUTED from live signals — which means
-- there is no record that a human ever saw an item, took it, or closed it with a
-- reason. A GM can watch "Field 6 scoreboard offline" sit in the queue all day
-- with no idea whether anyone is on it. This turns work orders into the venue's
-- accountable issue record: assigned -> acknowledged -> resolved, with notes.
--
-- Fully ADDITIVE: every column is nullable or defaulted, so existing rows and the
-- current create/status code keep working untouched. No CHECK constraint exists on
-- status (verified), so the new 'acknowledged' state is app-level validation only.
--
-- field_id stays NOT NULL: today every issue is raised against a field, and
-- relaxing it speculatively would let venue-wide issues in before the UI can group
-- them. Revisit when venue-scoped issues are actually built.

alter table public.field_work_orders
  -- Who owns it. Role for "any grounds crew", user for a named person.
  add column if not exists assigned_role text,
  add column if not exists assigned_to_user_id uuid references public.users(id) on delete set null,
  -- Somebody has seen it and is on it. The step the computed queue can't express.
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references public.users(id) on delete set null,
  -- When it needs to be done — drives urgency ordering and overdue flags.
  add column if not exists due_at timestamptz,
  -- Why/how it was closed. Without this, "done" is unauditable.
  add column if not exists resolution_notes text,
  -- 'manual' (a human reported it) vs 'system' (automation raised it). Lets the
  -- queue show provenance and stops automation from spamming duplicates.
  add column if not exists source text not null default 'manual',
  -- Optional linkage to the thing that caused it.
  add column if not exists game_id uuid references public.sessions(id) on delete set null,
  add column if not exists asset_id uuid references public.venue_assets(id) on delete set null;

-- Open work by field, and "what's on my plate" / overdue lookups.
create index if not exists field_work_orders_status_idx on public.field_work_orders (status);
create index if not exists field_work_orders_field_status_idx on public.field_work_orders (field_id, status);
create index if not exists field_work_orders_assignee_idx on public.field_work_orders (assigned_to_user_id) where assigned_to_user_id is not null;
create index if not exists field_work_orders_due_idx on public.field_work_orders (due_at) where due_at is not null;

-- Read path is service-role only (work-orders.ts + admin pages); keep anon and
-- authenticated off it. reported_by / assignee are staff identifiers.
revoke all on public.field_work_orders from anon;
revoke all on public.field_work_orders from authenticated;
