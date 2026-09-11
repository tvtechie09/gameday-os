-- Cover the logical-removal actor foreign key identified by the staging
-- performance advisor. This is additive and limited to Work Order evidence.
create index if not exists work_order_photos_remover_idx
  on public.work_order_photos (removed_by_actor_user_id)
  where removed_by_actor_user_id is not null;
