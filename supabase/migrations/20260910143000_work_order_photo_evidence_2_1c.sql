-- GameDay Improvement 2.1C: private, auditable Work Order photo evidence.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('work-order-evidence', 'work-order-evidence', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.field_work_orders(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  uploader_actor_user_id uuid references public.users(id) on delete set null,
  storage_key text not null unique,
  purpose text not null check (purpose in ('report', 'progress', 'resolution')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 8388608),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by_actor_user_id uuid references public.users(id) on delete set null,
  check ((removed_at is null and removed_by_actor_user_id is null) or removed_at is not null)
);

create index if not exists work_order_photos_active_order_idx
  on public.work_order_photos (work_order_id, created_at)
  where removed_at is null;
create index if not exists work_order_photos_venue_idx
  on public.work_order_photos (venue_id, created_at desc);
create index if not exists work_order_photos_uploader_idx
  on public.work_order_photos (uploader_actor_user_id)
  where uploader_actor_user_id is not null;

alter table public.work_order_photos enable row level security;
alter table public.work_order_photos force row level security;
revoke all on table public.work_order_photos from anon, authenticated;
grant select, insert, update on table public.work_order_photos to service_role;

-- No storage.objects policy is created for browser roles. The private bucket is
-- written by the server and read through short-lived signed URLs only.
