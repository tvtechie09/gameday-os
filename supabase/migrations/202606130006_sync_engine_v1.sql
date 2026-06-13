create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.external_sources(id) on delete set null,
  source_type text not null,
  status text not null default 'pending',
  records_found integer not null default 0,
  records_imported integer not null default 0,
  records_skipped integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid not null references public.sync_jobs(id) on delete cascade,
  source_record_id text not null,
  source_data jsonb not null,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.sync_jobs
  drop constraint if exists sync_jobs_status_check;

alter table public.sync_jobs
  add constraint sync_jobs_status_check
  check (status in ('pending', 'running', 'completed', 'failed'));

alter table public.sync_queue
  drop constraint if exists sync_queue_review_status_check;

alter table public.sync_queue
  add constraint sync_queue_review_status_check
  check (review_status in ('pending', 'approved', 'rejected', 'imported'));

create index if not exists sync_jobs_source_id_idx on public.sync_jobs(source_id);
create index if not exists sync_jobs_status_idx on public.sync_jobs(status);
create index if not exists sync_jobs_created_at_idx on public.sync_jobs(created_at desc);
create index if not exists sync_queue_sync_job_id_idx on public.sync_queue(sync_job_id);
create index if not exists sync_queue_review_status_idx on public.sync_queue(review_status);
create index if not exists sync_queue_created_at_idx on public.sync_queue(created_at desc);

alter table public.sync_jobs enable row level security;
alter table public.sync_queue enable row level security;

create policy "Public can read sync jobs"
  on public.sync_jobs for select
  using (true);

create policy "Public can create sync jobs"
  on public.sync_jobs for insert
  with check (true);

create policy "Public can update sync jobs"
  on public.sync_jobs for update
  using (true)
  with check (true);

create policy "Public can read sync queue"
  on public.sync_queue for select
  using (true);

create policy "Public can create sync queue"
  on public.sync_queue for insert
  with check (true);

create policy "Public can update sync queue"
  on public.sync_queue for update
  using (true)
  with check (true);
