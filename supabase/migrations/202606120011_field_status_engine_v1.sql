alter table public.fields
  alter column status set default 'open';

update public.fields
set status = case
  when status = 'Ready' then 'open'
  when status = 'Weather hold' then 'delayed'
  when status = 'Maintenance' then 'maintenance'
  when status in ('open', 'active', 'delayed', 'closed', 'maintenance') then status
  else 'open'
end;

alter table public.fields
  drop constraint if exists fields_status_check;

alter table public.fields
  add constraint fields_status_check
  check (status in ('open', 'active', 'delayed', 'closed', 'maintenance'));
