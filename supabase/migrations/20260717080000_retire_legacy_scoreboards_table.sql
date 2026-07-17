-- Retire the legacy `scoreboards` table.
--
-- It held 9 rows since the demo seed and NOTHING in the app read it. Those 9
-- boards were backfilled into venue_assets (the canonical device store the
-- Command Center reads) by migration 20260717070000, verified 1:1. This drops the
-- dead copy.
--
-- NOT dropped: `scoreboard_profiles`. Despite being empty it backs a LIVE, nav'd
-- feature (/admin/scoreboards + the field control panel) -- it is the scoreboard
-- twin of audio_profiles, config not inventory. Dropping it would break a working
-- screen, so it stays.
--
-- One dependency blocks a plain DROP: the view `venue_technology_profile`
-- (documented in 20260713020000 as unused by the app) derives `has_scoreboard`
-- from scoreboards.status = 'Installed'. That was reading the dead table, so the
-- flag was stale. Repoint it at venue_assets FIRST -- same output columns, so
-- CREATE OR REPLACE works and no cascade is needed -- then the table drops clean.
--
-- Semantic note: venue_assets has no 'Installed' status (its states are
-- healthy/unknown/offline). "has_scoreboard" now means a scoreboard asset EXISTS
-- for the venue, which is the honest reading of the question the flag answers.
--
-- Idempotent.

create or replace view public.venue_technology_profile as
with venue_scoreboards as (
  select coalesce(a.venue_id, f.venue_id) as venue_id,
         bool_or(a.asset_type = 'scoreboard') as has_scoreboard
  from venue_assets a
  left join fields f on f.id = a.field_id
  where a.asset_type = 'scoreboard'
  group by coalesce(a.venue_id, f.venue_id)
),
venue_resources as (
  select coalesce(r.venue_id, f.venue_id) as venue_id,
         bool_or(lower(r.resource_type) = 'camera' and r.status = 'Installed') as has_camera,
         bool_or(lower(r.resource_type) = 'streaming' and r.status = 'Installed') as has_streaming,
         bool_or(lower(r.resource_type) = 'audio' and r.status = 'Installed') as has_audio,
         bool_or(lower(r.resource_type) = 'wifi' and r.status = 'Installed') as has_wifi,
         bool_or(lower(r.resource_type) = 'video_display' and r.status = 'Installed') as has_video_display,
         bool_or(lower(r.resource_type) = 'weather_station' and r.status = 'Installed') as has_weather_station
  from resources r
  left join fields f on f.id = r.field_id
  group by coalesce(r.venue_id, f.venue_id)
)
select v.id as venue_id,
       v.name,
       v.venue_tier,
       coalesce(sb.has_scoreboard, false) as has_scoreboard,
       coalesce(vr.has_camera, false) as has_camera,
       coalesce(vr.has_streaming, false) as has_streaming,
       coalesce(vr.has_audio, false) as has_audio,
       coalesce(vr.has_wifi, false) as has_wifi,
       coalesce(vr.has_video_display, false) as has_video_display,
       coalesce(vr.has_weather_station, false) as has_weather_station,
       coalesce(sb.has_scoreboard, false)::int
         + coalesce(vr.has_camera, false)::int
         + coalesce(vr.has_streaming, false)::int
         + coalesce(vr.has_audio, false)::int
         + coalesce(vr.has_wifi, false)::int
         + coalesce(vr.has_video_display, false)::int
         + coalesce(vr.has_weather_station, false)::int as technology_categories_installed,
       7 as technology_categories_total
from venues v
left join venue_scoreboards sb on sb.venue_id = v.id
left join venue_resources vr on vr.venue_id = v.id;

drop table if exists public.scoreboards;
