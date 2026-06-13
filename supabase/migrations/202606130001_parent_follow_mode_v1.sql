create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  follow_type text not null check (follow_type in ('field', 'session')),
  display_name text,
  created_at timestamptz not null default now(),
  constraint follows_session_type_check check (
    (follow_type = 'field' and session_id is null)
    or (follow_type = 'session' and session_id is not null)
  )
);

create index if not exists follows_field_id_idx on public.follows(field_id);
create index if not exists follows_session_id_idx on public.follows(session_id);
create index if not exists follows_created_at_idx on public.follows(created_at);

alter table public.follows enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'follows'
      and policyname = 'Public can insert follows'
  ) then
    create policy "Public can insert follows"
      on public.follows for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'follows'
      and policyname = 'Public can read follows'
  ) then
    create policy "Public can read follows"
      on public.follows for select
      using (true);
  end if;
end $$;
