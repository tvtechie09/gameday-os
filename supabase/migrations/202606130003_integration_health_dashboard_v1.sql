alter table public.external_sources
  drop constraint if exists external_sources_source_status_check;

update public.external_sources
set source_status = case
  when source_status = 'active' then 'connected'
  when source_status = 'draft' then 'not_configured'
  when source_status in ('connected', 'not_configured', 'error', 'paused', 'unknown') then source_status
  else 'unknown'
end;

alter table public.external_sources
  alter column source_status set default 'not_configured';

alter table public.external_sources
  add constraint external_sources_source_status_check
  check (source_status in ('connected', 'not_configured', 'error', 'paused', 'unknown'));
