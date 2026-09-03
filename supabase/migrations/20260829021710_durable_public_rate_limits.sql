create table if not exists public.public_failure_rate_limits (
  bucket_key text primary key,
  failures integer not null default 0 check (failures >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.public_failure_rate_limits enable row level security;
revoke all on table public.public_failure_rate_limits from public, anon, authenticated;

create or replace function public.consume_public_failure_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer,
  p_record_failure boolean default false
)
returns table(blocked boolean, retry_after integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_failures integer := 0;
  v_reset_at timestamptz := now();
begin
  if char_length(p_bucket_key) < 1 or char_length(p_bucket_key) > 200
    or p_limit < 1 or p_limit > 1000
    or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit parameters';
  end if;

  if p_record_failure then
    insert into public.public_failure_rate_limits(bucket_key, failures, reset_at, updated_at)
    values (p_bucket_key, 1, now() + make_interval(secs => p_window_seconds), now())
    on conflict (bucket_key) do update set
      failures = case when public.public_failure_rate_limits.reset_at <= now() then 1 else public.public_failure_rate_limits.failures + 1 end,
      reset_at = case when public.public_failure_rate_limits.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else public.public_failure_rate_limits.reset_at end,
      updated_at = now()
    returning failures, reset_at into v_failures, v_reset_at;
  else
    select limits.failures, limits.reset_at
      into v_failures, v_reset_at
      from public.public_failure_rate_limits limits
      where limits.bucket_key = p_bucket_key;
    if not found or v_reset_at <= now() then
      return query select false, 0;
      return;
    end if;
  end if;

  return query select
    v_failures >= p_limit,
    case when v_failures >= p_limit then greatest(1, ceil(extract(epoch from (v_reset_at - now())))::integer) else 0 end;
end;
$$;

revoke all on function public.consume_public_failure_limit(text, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.consume_public_failure_limit(text, integer, integer, boolean) to service_role;
