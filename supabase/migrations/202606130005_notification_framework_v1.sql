create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  title text not null,
  message text not null,
  venue_id uuid references public.venues(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('alert', 'field_status', 'session_status', 'resource', 'volunteer', 'sponsor'));

create index if not exists notifications_type_created_at_idx on public.notifications(notification_type, created_at desc);
create index if not exists notifications_venue_id_idx on public.notifications(venue_id);
create index if not exists notifications_field_id_idx on public.notifications(field_id);
create index if not exists notifications_session_id_idx on public.notifications(session_id);

alter table public.notifications enable row level security;

create policy "Public can read notifications"
  on public.notifications for select
  using (true);

create policy "Public can create notifications"
  on public.notifications for insert
  with check (true);
