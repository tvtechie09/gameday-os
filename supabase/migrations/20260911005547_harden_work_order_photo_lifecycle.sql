-- GameDay RC 1.0 Phases 13-15
-- Serialize per-Work-Order photo reservations and make incomplete Storage
-- operations visible without granting browser access to media metadata.

alter table public.work_order_photos
  add column if not exists storage_status text not null default 'ACTIVE',
  add column if not exists storage_error_code text,
  add column if not exists storage_updated_at timestamptz not null default now();

do $$
begin
  alter table public.work_order_photos
    add constraint work_order_photos_storage_status_check
    check (storage_status in ('PENDING', 'ACTIVE', 'DELETE_PENDING', 'REMOVED', 'FAILED'));
exception when duplicate_object then null;
end $$;

create index if not exists work_order_photos_storage_attention_idx
  on public.work_order_photos (storage_updated_at, work_order_id)
  where storage_status in ('PENDING', 'DELETE_PENDING', 'FAILED');

create or replace function public.enforce_work_order_photo_reservation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active_count integer;
begin
  -- The Work Order row is the per-object serialization lock. Concurrent
  -- reservations for different Work Orders remain independent.
  perform 1
  from public.field_work_orders wo
  where wo.id = new.work_order_id
    and wo.venue_id = new.venue_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'WORK_ORDER_PHOTO_SCOPE_DENIED';
  end if;

  select count(*)
  into v_active_count
  from public.work_order_photos photo
  where photo.work_order_id = new.work_order_id
    and photo.venue_id = new.venue_id
    and photo.removed_at is null
    and photo.storage_status in ('PENDING', 'ACTIVE');

  if v_active_count >= 5 then
    raise exception using errcode = '23514', message = 'WORK_ORDER_PHOTO_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_work_order_photo_reservation on public.work_order_photos;
create trigger enforce_work_order_photo_reservation
before insert on public.work_order_photos
for each row execute function public.enforce_work_order_photo_reservation();

create or replace function public.get_work_order_photo_storage_health()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'pendingUploadCount', count(*) filter (where photo.storage_status = 'PENDING'),
    'stalePendingUploadCount', count(*) filter (
      where photo.storage_status = 'PENDING'
        and photo.storage_updated_at < now() - interval '15 minutes'
    ),
    'deletePendingCount', count(*) filter (where photo.storage_status = 'DELETE_PENDING'),
    'failedUploadCount', count(*) filter (where photo.storage_status = 'FAILED'),
    'activeMissingObjectCount', count(*) filter (
      where photo.storage_status = 'ACTIVE' and object.id is null
    ),
    'orphanObjectCount', (
      select count(*)
      from storage.objects orphan
      left join public.work_order_photos known
        on known.storage_key = orphan.name
      where orphan.bucket_id = 'work-order-evidence'
        and known.id is null
    )
  )
  from public.work_order_photos photo
  left join storage.objects object
    on object.bucket_id = 'work-order-evidence'
   and object.name = photo.storage_key;
$$;

revoke all on function public.enforce_work_order_photo_reservation()
  from public, anon, authenticated;
revoke all on function public.get_work_order_photo_storage_health()
  from public, anon, authenticated;
grant execute on function public.enforce_work_order_photo_reservation()
  to service_role;
grant execute on function public.get_work_order_photo_storage_health()
  to service_role;

comment on function public.enforce_work_order_photo_reservation()
  is 'Serializes private Work Order photo reservations and enforces venue ownership plus the five-photo limit.';
comment on function public.get_work_order_photo_storage_health()
  is 'Returns PII-free aggregate Work Order photo lifecycle and orphan health for trusted operations.';
