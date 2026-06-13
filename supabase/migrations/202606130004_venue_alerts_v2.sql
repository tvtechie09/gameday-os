alter table public.alerts
  add column if not exists alert_scope text not null default 'venue',
  add column if not exists alert_priority text not null default 'normal',
  add column if not exists alert_visibility text not null default 'public';

alter table public.alerts
  drop constraint if exists alerts_alert_scope_check,
  drop constraint if exists alerts_alert_priority_check,
  drop constraint if exists alerts_alert_visibility_check;

update public.alerts
set
  alert_scope = case
    when field_id is not null then 'field'
    when tournament_id is not null then 'tournament'
    else 'venue'
  end
where alert_scope is null or alert_scope = '';

update public.alerts
set alert_priority = 'normal'
where alert_priority is null or alert_priority = '';

update public.alerts
set alert_visibility = 'public'
where alert_visibility is null or alert_visibility = '';

alter table public.alerts
  add constraint alerts_alert_scope_check check (alert_scope in ('venue', 'field', 'tournament', 'global')),
  add constraint alerts_alert_priority_check check (alert_priority in ('low', 'normal', 'high', 'urgent')),
  add constraint alerts_alert_visibility_check check (alert_visibility in ('public', 'admin_only'));

create index if not exists alerts_scope_idx on public.alerts(alert_scope);
create index if not exists alerts_priority_idx on public.alerts(alert_priority);
create index if not exists alerts_visibility_idx on public.alerts(alert_visibility);
