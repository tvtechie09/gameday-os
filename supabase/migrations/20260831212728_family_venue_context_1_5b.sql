-- Family 1.5B: parent-safe projection of canonical Venue OS alerts.
--
-- `alerts` remains the single write model used by Venue staff, storm actions,
-- field pages, and follower delivery. Family reads this intentionally narrow
-- projection only after it has independently proved that the signed-in family
-- has a relevant event at the venue. Internal/admin commentary and arbitrary
-- links are not projected.

set search_path = public, extensions;

begin;

create index if not exists alerts_family_context_idx
  on public.alerts (venue_id, is_active, alert_visibility, start_time, end_time);

create index if not exists alerts_family_field_context_idx
  on public.alerts (field_id, start_time, end_time)
  where is_active and alert_visibility = 'public' and field_id is not null;

create or replace view public.venue_family_announcements
with (security_invoker = true)
as
select
  a.id,
  a.organization_id,
  a.venue_id,
  a.field_id,
  a.tournament_id,
  a.title,
  a.message,
  a.alert_type,
  a.alert_scope,
  a.alert_priority,
  case
    when a.alert_priority = 'urgent'
      or a.alert_type in ('emergency', 'field_closure') then 'critical'
    when a.alert_priority = 'high'
      or a.alert_type in ('weather', 'delay', 'parking') then 'important'
    else 'informational'
  end as family_severity,
  a.start_time as publish_at,
  a.end_time as expires_at,
  a.created_at,
  a.updated_at
from public.alerts a
where a.is_active
  and a.alert_visibility = 'public';

revoke all on public.venue_family_announcements
  from public, anon, authenticated;
grant select on public.venue_family_announcements to service_role;

comment on view public.venue_family_announcements is
  'Parent-safe projection of canonical Venue OS alerts. Family must still enforce event, venue, field, tournament, and tenant relevance.';

commit;
