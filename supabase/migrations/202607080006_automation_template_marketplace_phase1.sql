-- GameDay OS Automation Template Marketplace Phase 1
-- Internal, approved one-click templates for creating scoped automation workflows.

create extension if not exists pgcrypto;

create table if not exists public.automation_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  description text not null,
  workflow_type text not null,
  event_type text not null,
  event_source text not null default 'admin' check (event_source in ('weather', 'field', 'session', 'schedule', 'admin')),
  event_payload jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  required_configuration jsonb not null default '[]'::jsonb,
  default_notification_audience text not null default 'venue_admins',
  severity text not null default 'info' check (severity in ('info', 'warning', 'urgent')),
  template_status text not null default 'approved' check (template_status in ('approved', 'disabled')),
  is_internal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_workflows add column if not exists template_id uuid references public.automation_templates(id) on delete set null;
alter table public.automation_workflows add column if not exists template_key text;
alter table public.automation_workflows add column if not exists notification_audience text;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'automation_workflows_workflow_type_check' and conrelid = 'public.automation_workflows'::regclass) then
    alter table public.automation_workflows drop constraint automation_workflows_workflow_type_check;
  end if;

  alter table public.automation_workflows
    add constraint automation_workflows_workflow_type_check
    check (workflow_type in ('weather_delay', 'lightning_delay', 'field_closed', 'game_final', 'schedule_changed', 'team_arrival', 'field_turnover', 'game_start'));
end $$;

create index if not exists automation_templates_template_key_idx on public.automation_templates(template_key);
create index if not exists automation_templates_status_idx on public.automation_templates(template_status);
create index if not exists automation_workflows_template_key_idx on public.automation_workflows(template_key);

alter table public.automation_templates enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_templates' and policyname = 'automation_templates_service_role_all') then
    create policy automation_templates_service_role_all on public.automation_templates for all to service_role using (true) with check (true);
  end if;
end $$;

insert into public.permissions (key, name, description)
values
  ('automation.templates.install', 'Install Automation Templates', 'Install approved internal automation templates inside an approved scope.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with automation_template_permission_map(role_key, permission_key) as (
  values
    ('platform_admin', 'automation.templates.install'),
    ('organization_admin', 'automation.templates.install'),
    ('organization_owner', 'automation.templates.install'),
    ('venue_director', 'automation.templates.install'),
    ('tournament_director', 'automation.templates.install'),
    ('league_director', 'automation.templates.install')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from automation_template_permission_map
join public.roles on roles.key = automation_template_permission_map.role_key
join public.permissions on permissions.key = automation_template_permission_map.permission_key
on conflict do nothing;

insert into public.automation_templates (
  template_key,
  name,
  description,
  workflow_type,
  event_type,
  event_source,
  event_payload,
  conditions,
  actions,
  required_configuration,
  default_notification_audience,
  severity,
  template_status,
  is_internal
)
values
  (
    'weather-delay',
    'Weather Delay',
    'When severe weather, lightning, or rain delay is triggered, mark affected fields delayed and publish a venue alert.',
    'weather_delay',
    'weather.delay_started',
    'weather',
    '{"weatherStatus":"delay"}'::jsonb,
    '[{"conditionType":"weather_status","conditionConfig":{"values":["severe_weather","lightning","rain_delay"]},"sortOrder":0}]'::jsonb,
    '[{"actionType":"mark_fields_delayed","actionConfig":{"status":"delayed"},"sortOrder":0},{"actionType":"create_venue_alert","actionConfig":{"alertType":"weather","message":"Weather delay is active. Please watch for updates.","priority":"urgent","title":"Weather Delay","visibility":"public"},"sortOrder":1},{"actionType":"notify_admins","actionConfig":{"channel":"admin_dashboard"},"sortOrder":2}]'::jsonb,
    '["Venue","Affected fields","Notification audience"]'::jsonb,
    'venue_admins',
    'urgent',
    'approved',
    true
  ),
  (
    'lightning-delay',
    'Lightning Delay',
    'When lightning delay is issued, pause affected fields, publish an urgent venue alert, and notify admins.',
    'lightning_delay',
    'weather.lightning_delay_started',
    'weather',
    '{"weatherStatus":"lightning_delay"}'::jsonb,
    '[{"conditionType":"weather_status","conditionConfig":{"value":"lightning_delay"},"sortOrder":0}]'::jsonb,
    '[{"actionType":"mark_fields_delayed","actionConfig":{"reason":"lightning","status":"delayed"},"sortOrder":0},{"actionType":"create_venue_alert","actionConfig":{"alertType":"weather","message":"Lightning delay is active. Please clear fields and wait for updates.","priority":"urgent","title":"Lightning Delay","visibility":"public"},"sortOrder":1},{"actionType":"notify_admins","actionConfig":{"channel":"operations_center"},"sortOrder":2}]'::jsonb,
    '["Venue","Affected fields","Notification audience"]'::jsonb,
    'venue_admins',
    'urgent',
    'approved',
    true
  ),
  (
    'field-closed',
    'Field Closed',
    'When an admin closes a field, notify affected games and mark the schedule impacted.',
    'field_closed',
    'field.status_closed',
    'field',
    '{"fieldStatus":"closed"}'::jsonb,
    '[{"conditionType":"field_status","conditionConfig":{"value":"closed"},"sortOrder":0}]'::jsonb,
    '[{"actionType":"create_venue_alert","actionConfig":{"alertType":"field_closure","message":"This field is closed. Schedule updates may follow.","priority":"urgent","title":"Field Closed","visibility":"public"},"sortOrder":0},{"actionType":"mark_schedule_impacted","actionConfig":{"impactType":"field_closed"},"sortOrder":1},{"actionType":"notify_admins","actionConfig":{"channel":"venue_dashboard"},"sortOrder":2}]'::jsonb,
    '["Field","Venue","Notification audience"]'::jsonb,
    'venue_admins',
    'urgent',
    'approved',
    true
  ),
  (
    'game-final',
    'Game Final',
    'When a game becomes final, update field availability, prep next game workflow, and log the result.',
    'game_final',
    'session.game_final',
    'session',
    '{"status":"final"}'::jsonb,
    '[{"conditionType":"game_status","conditionConfig":{"value":"final"},"sortOrder":0}]'::jsonb,
    '[{"actionType":"record_session_timeline","actionConfig":{"eventType":"game_final"},"sortOrder":0},{"actionType":"prep_next_game","actionConfig":{"nextGameStatus":"ready_check"},"sortOrder":1},{"actionType":"update_field_availability","actionConfig":{"status":"open"},"sortOrder":2}]'::jsonb,
    '["Session","Field"]'::jsonb,
    'venue_admins',
    'info',
    'approved',
    true
  ),
  (
    'schedule-changed',
    'Schedule Changed',
    'When game time or field changes, update venue dashboards and log the schedule change.',
    'schedule_changed',
    'schedule.changed',
    'schedule',
    '{"changed":true}'::jsonb,
    '[{"conditionType":"schedule_change","conditionConfig":{"fields":["start_time","field_id"]},"sortOrder":0}]'::jsonb,
    '[{"actionType":"mark_schedule_impacted","actionConfig":{"impactType":"schedule_changed"},"sortOrder":0},{"actionType":"notify_admins","actionConfig":{"channel":"venue_dashboard"},"sortOrder":1},{"actionType":"record_session_timeline","actionConfig":{"eventType":"schedule_changed"},"sortOrder":2}]'::jsonb,
    '["Session or field","Notification audience"]'::jsonb,
    'venue_admins',
    'warning',
    'approved',
    true
  ),
  (
    'team-arrival',
    'Team Arrival',
    'When a team checks in, notify operations staff and write a session timeline update.',
    'team_arrival',
    'team.arrived',
    'admin',
    '{"teamArrived":true}'::jsonb,
    '[{"conditionType":"team_check_in","conditionConfig":{"value":"arrived"},"sortOrder":0}]'::jsonb,
    '[{"actionType":"record_session_timeline","actionConfig":{"eventType":"team_arrival"},"sortOrder":0},{"actionType":"notify_admins","actionConfig":{"channel":"operations_center"},"sortOrder":1}]'::jsonb,
    '["Session","Notification audience"]'::jsonb,
    'venue_staff',
    'info',
    'approved',
    true
  ),
  (
    'field-turnover',
    'Field Turnover',
    'When a field turnover begins, flag the field for prep and notify operations staff.',
    'field_turnover',
    'field.turnover_started',
    'field',
    '{"turnover":true}'::jsonb,
    '[{"conditionType":"field_turnover","conditionConfig":{"value":"turnover"},"sortOrder":0}]'::jsonb,
    '[{"actionType":"update_field_availability","actionConfig":{"status":"maintenance"},"sortOrder":0},{"actionType":"notify_admins","actionConfig":{"channel":"operations_center"},"sortOrder":1}]'::jsonb,
    '["Field","Notification audience"]'::jsonb,
    'venue_staff',
    'warning',
    'approved',
    true
  ),
  (
    'game-start',
    'Game Start',
    'When a game starts, mark the field active, write a timeline event, and notify the venue dashboard.',
    'game_start',
    'session.game_started',
    'session',
    '{"status":"active"}'::jsonb,
    '[{"conditionType":"game_status","conditionConfig":{"value":"active"},"sortOrder":0}]'::jsonb,
    '[{"actionType":"record_session_timeline","actionConfig":{"eventType":"game_started"},"sortOrder":0},{"actionType":"update_field_availability","actionConfig":{"status":"active"},"sortOrder":1},{"actionType":"notify_admins","actionConfig":{"channel":"venue_dashboard"},"sortOrder":2}]'::jsonb,
    '["Session","Field"]'::jsonb,
    'venue_admins',
    'info',
    'approved',
    true
  )
on conflict (template_key) do update set
  name = excluded.name,
  description = excluded.description,
  workflow_type = excluded.workflow_type,
  event_type = excluded.event_type,
  event_source = excluded.event_source,
  event_payload = excluded.event_payload,
  conditions = excluded.conditions,
  actions = excluded.actions,
  required_configuration = excluded.required_configuration,
  default_notification_audience = excluded.default_notification_audience,
  severity = excluded.severity,
  template_status = excluded.template_status,
  is_internal = excluded.is_internal,
  updated_at = now();
