-- Provider-neutral schedule-change outbox and one atomic venue operation RPC.
-- GameDay views continue reading canonical public.sessions; connected providers
-- can later drain this outbox without putting vendor logic in the operations UI.

create table if not exists public.schedule_change_outbox (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  operation_id uuid not null,
  operation_type text not null,
  external_source text,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'delivered', 'failed', 'not_applicable')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists schedule_change_outbox_delivery_idx
  on public.schedule_change_outbox (delivery_status, created_at);
create unique index if not exists schedule_change_outbox_operation_session_unique
  on public.schedule_change_outbox (operation_id, session_id);

alter table public.schedule_change_outbox enable row level security;
revoke all on public.schedule_change_outbox from anon, authenticated;
grant select, insert, update, delete on public.schedule_change_outbox to service_role;

create or replace function public.apply_schedule_operation(
  p_venue_id uuid,
  p_operation_id uuid,
  p_operation_type text,
  p_actor_user_id uuid,
  p_changes jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  change_row jsonb;
  changed_ids uuid[] := '{}';
  applied integer := 0;
begin
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) = 0 or jsonb_array_length(p_changes) > 200 then
    raise exception 'Schedule operation requires 1 to 200 changes.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_venue_id::text, 0));

  for change_row in select value from jsonb_array_elements(p_changes)
  loop
    if not exists (
      select 1 from public.sessions session
      join public.fields old_field on old_field.id = session.field_id
      join public.fields new_field on new_field.id = (change_row->>'field_id')::uuid
      where session.id = (change_row->>'session_id')::uuid
        and old_field.venue_id = p_venue_id
        and new_field.venue_id = p_venue_id
    ) then
      raise exception 'Schedule change is outside the venue boundary.';
    end if;

    update public.sessions
    set field_id = (change_row->>'field_id')::uuid,
        start_time = (change_row->>'start_time')::timestamptz,
        end_time = nullif(change_row->>'end_time', '')::timestamptz,
        lifecycle_status = change_row->>'lifecycle_status',
        status = case when change_row->>'lifecycle_status' in ('live') then 'active' when change_row->>'lifecycle_status' = 'final' then 'final' else 'scheduled' end,
        game_status = case when change_row->>'lifecycle_status' in ('live') then 'active' when change_row->>'lifecycle_status' = 'final' then 'final' else 'scheduled' end,
        updated_at = now()
    where id = (change_row->>'session_id')::uuid;

    changed_ids := array_append(changed_ids, (change_row->>'session_id')::uuid);
    insert into public.schedule_change_outbox (venue_id, session_id, operation_id, operation_type, external_source, payload, delivery_status)
    select p_venue_id, session.id, p_operation_id, p_operation_type, session.external_source,
      jsonb_build_object('field_id', session.field_id, 'start_time', session.start_time, 'end_time', session.end_time, 'lifecycle_status', session.lifecycle_status, 'reason', change_row->>'reason', 'actor_user_id', p_actor_user_id),
      case when session.external_source is null then 'not_applicable' else 'pending' end
    from public.sessions session where session.id = (change_row->>'session_id')::uuid;
    applied := applied + 1;
  end loop;

  if exists (
    select 1
    from public.sessions first_session
    join public.fields first_field on first_field.id = first_session.field_id
    join public.sessions second_session on second_session.field_id = first_session.field_id and second_session.id > first_session.id
    where first_field.venue_id = p_venue_id
      and (first_session.id = any(changed_ids) or second_session.id = any(changed_ids))
      and first_session.lifecycle_status not in ('cancelled', 'postponed', 'final', 'archived')
      and second_session.lifecycle_status not in ('cancelled', 'postponed', 'final', 'archived')
      and first_session.start_time < coalesce(second_session.end_time, second_session.start_time + interval '90 minutes')
      and second_session.start_time < coalesce(first_session.end_time, first_session.start_time + interval '90 minutes')
  ) then
    raise exception 'Schedule conflict detected; no changes were applied.';
  end if;

  return applied;
end;
$$;

revoke all on function public.apply_schedule_operation(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_schedule_operation(uuid, uuid, text, uuid, jsonb) to service_role;
