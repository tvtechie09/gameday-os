-- Tournament OS remains the canonical server-managed source. Family consumes
-- its published projections and never mutates official tournament state.
-- RLS already denies browser writes; privileges must independently agree.
revoke insert, update, delete, truncate, references, trigger
  on table public.tournaments
  from public, anon, authenticated;

grant select on table public.tournaments to anon, authenticated;
grant select, insert, update, delete on table public.tournaments to service_role;

comment on table public.tournaments is
  'Canonical Tournament OS record. Browser roles may read published-compatible summary data but all mutations remain server/service-role managed.';
