-- GameDay Improvement 2.1A: recipient-owned, venue-scoped in-app preferences.
-- Browser roles receive no direct table access; the server derives actor and venue.

create table if not exists public.venue_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  category text not null check (category in ('game_changes', 'field_venue_changes', 'work_updates', 'announcements')),
  channel text not null default 'in_app' check (channel = 'in_app'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_user_id, venue_id, category, channel)
);

create index if not exists venue_notification_preferences_venue_user_idx
  on public.venue_notification_preferences (venue_id, auth_user_id);

alter table public.venue_notification_preferences enable row level security;
alter table public.venue_notification_preferences force row level security;
revoke all on table public.venue_notification_preferences from anon, authenticated;
grant all on table public.venue_notification_preferences to service_role;

alter table public.notifications
  add column if not exists category text,
  add column if not exists priority text not null default 'normal',
  add column if not exists dedupe_key text;

update public.notifications
set category = case
  when notification_type = 'session_status' then 'game_changes'
  when notification_type = 'field_status' then 'field_venue_changes'
  when notification_type in ('resource', 'volunteer') then 'work_updates'
  else 'announcements'
end
where category is null;

alter table public.notifications
  alter column category set not null,
  add constraint notifications_category_check
    check (category in ('game_changes', 'field_venue_changes', 'work_updates', 'announcements')),
  add constraint notifications_priority_check
    check (priority in ('normal', 'urgent')),
  add constraint notifications_type_dedupe_key_unique
    unique (notification_type, dedupe_key);

-- Retire the legacy browser-wide policies. Notification reads and writes are
-- performed by tenant-filtered server services; service_role still bypasses RLS.
drop policy if exists "Public can read notifications" on public.notifications;
drop policy if exists "Public can create notifications" on public.notifications;
alter table public.notifications force row level security;
revoke all on table public.notifications from anon, authenticated;
grant all on table public.notifications to service_role;
