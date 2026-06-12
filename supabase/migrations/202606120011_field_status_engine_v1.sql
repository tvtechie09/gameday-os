alter table public.fields
  add column if not exists field_status text;

update public.fields
set field_status = case
  when field_status in ('open', 'active', 'delayed', 'closed', 'maintenance') then field_status
  when status = 'Ready' then 'open'
  when status = 'Weather hold' then 'delayed'
  when status = 'Maintenance' then 'maintenance'
  when status in ('open', 'active', 'delayed', 'closed', 'maintenance') then status
  else 'open'
end;

alter table public.fields
  alter column field_status set default 'open';

alter table public.fields
  alter column field_status set not null;

alter table public.fields
  drop constraint if exists fields_field_status_check;

alter table public.fields
  add constraint fields_field_status_check
  check (field_status in ('open', 'active', 'delayed', 'closed', 'maintenance'));
