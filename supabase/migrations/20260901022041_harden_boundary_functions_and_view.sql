-- Browser users must reach score and device mutations through authenticated,
-- scope-checked server routes. The canonical engine RPC is service-only.
revoke all on function public.game_engine_apply(
  uuid, integer, integer, integer, jsonb, text, uuid, text, text, integer,
  timestamptz, text, text, text, text, text, text, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.game_engine_apply(
  uuid, integer, integer, integer, jsonb, text, uuid, text, text, integer,
  timestamptz, text, text, text, text, text, text, text, jsonb, jsonb
) to service_role;

-- This function is invoked by a database trigger. It is not a public RPC.
revoke all on function public.notify_slack_new_lead()
  from public, anon, authenticated;
grant execute on function public.notify_slack_new_lead() to service_role;

-- Pin trigger-function name resolution even though these functions execute as
-- the caller. This keeps later schema changes from altering their behavior.
alter function public.sync_snapshot_revision() set search_path = public;
alter function public.game_events_block_mutation() set search_path = public;

-- The venue technology summary must honor the querying role's privileges and
-- underlying RLS instead of the view creator's privileges.
alter view public.venue_technology_profile set (security_invoker = true);
