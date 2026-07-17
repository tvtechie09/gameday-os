-- Backfill the orphaned scoreboards into venue_assets.
--
-- WHY: nine Daktronics boards have sat in `scoreboards` since the demo seed, and
-- NOTHING in the app reads that table. Meanwhile venue_assets -- what the Command
-- Center actually reads for its device checks -- was empty platform-wide, so the
-- "Scoreboards feeding" item said "None registered" on every venue including the
-- flagship. Real hardware, invisible to the one screen that matters.
--
-- venue_assets is canonical (see 20260717040000 and provisioning.ts).
--
-- STATUS MAPPING is the honest part:
--   Installed + Connected     -> healthy  (networked; it reports to us)
--   Installed + Not Connected -> unknown  (a MANUAL board -- a human turns the
--                                          numbers. It will never report, and
--                                          claiming "healthy" would be exactly the
--                                          green-that-means-nothing we removed from
--                                          deviceCheck.)
--   anything else             -> unknown
--
-- At Crossroads that yields 3 healthy + 6 unknown, so the checklist reads
-- "3 of 9 reporting" rather than a green lie. That is the true state of a complex
-- with three networked boards and six manual ones.
--
-- The legacy `scoreboards` table is left in place; retiring it is a separate call.
-- Idempotent: skips any field that already has a scoreboard asset.

insert into venue_assets (
  organization_id, venue_id, field_id, asset_name, asset_type, asset_category,
  manufacturer, model, physical_location, status, integration_status, notes
)
select
  coalesce(s.organization_id, v.organization_id),
  s.venue_id,
  s.field_id,
  coalesce(f.name || ' Scoreboard', 'Scoreboard'),
  'scoreboard',
  'scoreboards',
  s.manufacturer,
  s.model,
  s.controller,
  case
    when s.status = 'Installed' and s.integration_status = 'Connected' then 'healthy'
    else 'unknown'
  end,
  case s.integration_status
    when 'Connected' then 'connected'
    else 'not_configured'
  end,
  nullif(concat_ws(' ', s.notes, case when s.connection_type = 'manual' then '(Manual board — operated in the press box; does not feed automatically.)' end), '')
from scoreboards s
join venues v on v.id = s.venue_id
left join fields f on f.id = s.field_id
where s.venue_id is not null
  and s.field_id is not null
  and not exists (
    select 1 from venue_assets a
    where a.field_id = s.field_id and a.asset_type = 'scoreboard'
  );
