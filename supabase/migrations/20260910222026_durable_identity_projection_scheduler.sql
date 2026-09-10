-- GameDay RC 1.0 Phase 11A
-- One database-native scheduler for the existing Platform Identity queue.
-- No network extension, browser grant, provider ingestion, or canonical
-- identity mutation is introduced here.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table if not exists public.platform_identity_projection_worker_runs (
  id bigint generated always as identity primary key,
  worker_id text not null,
  run_status text not null check (run_status in ('RUNNING', 'SUCCEEDED', 'FAILED')),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  safe_error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.platform_identity_projection_worker_runs enable row level security;
alter table public.platform_identity_projection_worker_runs force row level security;

create index if not exists platform_identity_projection_worker_runs_started_idx
  on public.platform_identity_projection_worker_runs (started_at desc);

revoke all on table public.platform_identity_projection_worker_runs from public, anon, authenticated;
grant select, insert, update on table public.platform_identity_projection_worker_runs to service_role;
grant usage, select on sequence public.platform_identity_projection_worker_runs_id_seq to service_role;

create or replace function public.run_platform_identity_projection_worker(
  p_batch_size integer default 10,
  p_worker_id text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run_id bigint;
  v_worker_id text := coalesce(nullif(btrim(p_worker_id), ''), 'cron-' || gen_random_uuid()::text);
  v_claimed jsonb;
  v_queue_id uuid;
  v_failure_status text;
  v_message text;
  v_error_code text;
  v_claimed_count integer := 0;
  v_completed_count integer := 0;
  v_retry_count integer := 0;
  v_failed_count integer := 0;
begin
  if p_batch_size not between 1 and 25 or length(v_worker_id) > 120 then
    raise exception using errcode = '22023', message = 'INVALID_IDENTITY_PROJECTION_WORKER_CONFIG';
  end if;

  insert into public.platform_identity_projection_worker_runs (worker_id, run_status)
  values (v_worker_id, 'RUNNING')
  returning id into v_run_id;

  begin
    for v_index in 1..p_batch_size loop
      v_claimed := public.claim_platform_identity_projection(v_worker_id, 120);
      exit when v_claimed is null;

      v_claimed_count := v_claimed_count + 1;
      v_queue_id := (v_claimed ->> 'id')::uuid;

      begin
        perform public.apply_platform_identity_projection(v_queue_id, v_worker_id);
        v_completed_count := v_completed_count + 1;
      exception when others then
        get stacked diagnostics v_message = message_text;
        v_error_code := case
          when v_message in (
            'CANONICAL_STATE_CHANGED',
            'LEGACY_MAPPING_REQUIRED',
            'PROJECTION_SOURCE_SCOPE_DENIED',
            'PROJECTION_LEASE_NOT_OWNED'
          ) then v_message
          when v_message = 'PROJECTION_LEASE_EXPIRED' then v_message
          else 'TEMPORARY_PROJECTION_FAILURE'
        end;

        v_failure_status := public.fail_platform_identity_projection(
          v_queue_id,
          v_worker_id,
          v_error_code,
          v_error_code in ('TEMPORARY_PROJECTION_FAILURE', 'PROJECTION_LEASE_EXPIRED')
        );

        if v_failure_status = 'RETRY' then
          v_retry_count := v_retry_count + 1;
        else
          v_failed_count := v_failed_count + 1;
        end if;
      end;
    end loop;

    update public.platform_identity_projection_worker_runs
    set run_status = 'SUCCEEDED',
        claimed_count = v_claimed_count,
        completed_count = v_completed_count,
        retry_count = v_retry_count,
        failed_count = v_failed_count,
        completed_at = now()
    where id = v_run_id;
  exception when others then
    update public.platform_identity_projection_worker_runs
    set run_status = 'FAILED',
        safe_error_code = 'WORKER_EXECUTION_FAILED',
        completed_at = now()
    where id = v_run_id;

    return jsonb_build_object(
      'status', 'FAILED',
      'claimed', 0,
      'completed', 0,
      'retry', 0,
      'failed', 0,
      'errorCode', 'WORKER_EXECUTION_FAILED'
    );
  end;

  return jsonb_build_object(
    'status', 'SUCCEEDED',
    'claimed', v_claimed_count,
    'completed', v_completed_count,
    'retry', v_retry_count,
    'failed', v_failed_count
  );
end;
$$;

create or replace function public.get_platform_identity_projection_health()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'pendingCount', count(*) filter (where q.status = 'PENDING'),
    'oldestPendingAt', min(q.created_at) filter (where q.status = 'PENDING'),
    'oldestPendingAgeSeconds', coalesce(
      extract(epoch from (now() - min(q.created_at) filter (where q.status = 'PENDING')))::bigint,
      0
    ),
    'retryCount', count(*) filter (where q.status = 'RETRY'),
    'failedCount', count(*) filter (where q.status = 'FAILED'),
    'staleProcessingCount', count(*) filter (
      where q.status = 'PROCESSING' and q.lease_expires_at < now()
    ),
    'lastSuccessfulWorkerRunAt', (
      select max(r.completed_at)
      from public.platform_identity_projection_worker_runs r
      where r.run_status = 'SUCCEEDED'
    ),
    'lastFailedWorkerRunAt', (
      select max(r.completed_at)
      from public.platform_identity_projection_worker_runs r
      where r.run_status = 'FAILED'
    ),
    'lastWorkerRunStatus', (
      select r.run_status
      from public.platform_identity_projection_worker_runs r
      order by r.started_at desc
      limit 1
    ),
    'lastWorkerSafeErrorCode', (
      select r.safe_error_code
      from public.platform_identity_projection_worker_runs r
      order by r.started_at desc
      limit 1
    )
  )
  from public.platform_identity_projection_queue q;
$$;

revoke all on function public.run_platform_identity_projection_worker(integer, text)
  from public, anon, authenticated;
revoke all on function public.get_platform_identity_projection_health()
  from public, anon, authenticated;

grant execute on function public.run_platform_identity_projection_worker(integer, text)
  to service_role;
grant execute on function public.get_platform_identity_projection_health()
  to service_role;

comment on table public.platform_identity_projection_worker_runs
  is 'PII-free execution summaries for the database-native Platform Identity projection worker.';
comment on function public.run_platform_identity_projection_worker(integer, text)
  is 'Processes one bounded batch of the service-only identity projection queue and returns aggregate counts only.';
comment on function public.get_platform_identity_projection_health()
  is 'Returns PII-free aggregate queue health and last worker execution state for trusted operations.';

do $$
declare
  v_job record;
begin
  for v_job in
    select jobid from cron.job where jobname = 'gameday-identity-projection-worker'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  perform cron.schedule(
    'gameday-identity-projection-worker',
    '* * * * *',
    'select public.run_platform_identity_projection_worker(10);'
  );
end;
$$;
