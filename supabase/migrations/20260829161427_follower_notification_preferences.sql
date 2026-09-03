-- Account-free notification controls for public field and game followers.
-- Existing followers keep receiving all updates by default. Preference changes
-- flow through the rate-limited server route; browser roles cannot update rows.
alter table public.follows
  add column if not exists notification_level text not null default 'all_updates',
  add column if not exists email_enabled boolean not null default true,
  add column if not exists manage_token uuid not null default gen_random_uuid();

alter table public.follows
  drop constraint if exists follows_notification_level_check;

alter table public.follows
  add constraint follows_notification_level_check
  check (notification_level in ('critical_only', 'all_updates'));

create unique index if not exists follows_manage_token_unique_idx
  on public.follows(manage_token);

create index if not exists follows_deliverable_field_idx
  on public.follows(field_id, notification_level)
  where email_enabled = true and email is not null;

revoke update on table public.follows from anon, authenticated;
