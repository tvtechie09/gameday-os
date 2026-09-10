-- A missing legacy/domain mapping is recoverable configuration debt. The
-- scheduled worker retries it with the queue's existing bounded backoff so an
-- operator can repair the mapping without touching canonical identity state.

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
            'PROJECTION_SOURCE_SCOPE_DENIED',
            'PROJECTION_LEASE_NOT_OWNED'
          ) then v_message
          when v_message in ('LEGACY_MAPPING_REQUIRED', 'PROJECTION_LEASE_EXPIRED') then v_message
          else 'TEMPORARY_PROJECTION_FAILURE'
        end;

        v_failure_status := public.fail_platform_identity_projection(
          v_queue_id,
          v_worker_id,
          v_error_code,
          v_error_code in (
            'TEMPORARY_PROJECTION_FAILURE',
            'LEGACY_MAPPING_REQUIRED',
            'PROJECTION_LEASE_EXPIRED'
          )
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

revoke all on function public.run_platform_identity_projection_worker(integer, text)
  from public, anon, authenticated;
grant execute on function public.run_platform_identity_projection_worker(integer, text)
  to service_role;

comment on function public.run_platform_identity_projection_worker(integer, text)
  is 'Processes a bounded identity projection batch; missing legacy mapping retries with bounded queue backoff.';
