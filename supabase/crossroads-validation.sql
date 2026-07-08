-- =====================================================================
-- Crossroads Rebuild Validation / Orphan Audit
-- =====================================================================
-- Run AFTER applying migration 202607080001 and crossroads-rebuild-seed.sql.
-- Every check should return 0 rows (orphans) or the expected counts noted
-- inline. Intended for the Supabase SQL editor / psql against the live DB.
-- =====================================================================

\set venue_id '''a8235a4f-c5bf-4f79-b527-853d15f6ae17'''
\set org_id   '''c1000000-0000-4000-a000-000000000001'''

-- 1. Expected row counts -------------------------------------------------
--    fields: 31 (9 parents + 22 children); sessions: 18; alerts: 6;
--    sponsors: 6; amenities: 8; scoreboards: 9; cameras: 6;
--    audio_systems: 10; maintenance_records: 6; resources: 36.
select 'fields'               as entity, count(*) from public.fields               where venue_id = :venue_id
union all select 'parent fields',        count(*) from public.fields               where venue_id = :venue_id and parent_field_id is null
union all select 'child surfaces',       count(*) from public.fields               where venue_id = :venue_id and parent_field_id is not null
union all select 'sessions',             count(*) from public.sessions             where field_id in (select id from public.fields where venue_id = :venue_id)
union all select 'alerts',               count(*) from public.alerts               where venue_id = :venue_id
union all select 'sponsors',             count(*) from public.sponsors             where organization_id = :org_id
union all select 'amenities',            count(*) from public.amenities            where venue_id = :venue_id
union all select 'scoreboard_profiles',  count(*) from public.scoreboard_profiles  where venue_id = :venue_id
union all select 'cameras',              count(*) from public.cameras              where venue_id = :venue_id
union all select 'audio_systems',        count(*) from public.audio_systems        where venue_id = :venue_id
union all select 'maintenance_records',  count(*) from public.maintenance_records  where venue_id = :venue_id
union all select 'resources',            count(*) from public.resources            where venue_id = :venue_id;

-- 2. Old broken records are gone ----------------------------------------
select 'old field still present'      as issue, count(*) from public.fields              where id = '66954416-e942-460d-9a07-3f260b21f8f5'
union all select 'old scoreboard present',       count(*) from public.scoreboard_profiles where id = 'db3e0e75-57ec-4641-8b94-101cc546f09e';

-- 3. Venue -> org linkage is the new standalone org ---------------------
select id, name, organization_id from public.venues where id = :venue_id;

-- 4. ORPHAN CHECKS (all should return 0 rows) ---------------------------
-- 4a. Child fields pointing at a missing/foreign parent.
select 'orphan child field' as issue, c.id, c.name
from public.fields c
where c.venue_id = :venue_id and c.parent_field_id is not null
  and not exists (select 1 from public.fields p where p.id = c.parent_field_id and p.venue_id = :venue_id);

-- 4b. Sessions whose field no longer exists.
select 'orphan session' as issue, s.id, s.title
from public.sessions s
where s.field_id is not null
  and not exists (select 1 from public.fields f where f.id = s.field_id);

-- 4c. Field-scoped alerts pointing at a missing field.
select 'orphan alert' as issue, a.id, a.title
from public.alerts a
where a.venue_id = :venue_id and a.field_id is not null
  and not exists (select 1 from public.fields f where f.id = a.field_id);

-- 4d. Sponsor assignments referencing a missing sponsor/field.
select 'orphan sponsor_assignment (sponsor)' as issue, sa.id
from public.sponsor_assignments sa
where sa.sponsor_id in (select id from public.sponsors where organization_id = :org_id)
  and not exists (select 1 from public.sponsors sp where sp.id = sa.sponsor_id)
union all
select 'orphan sponsor_assignment (field)', sa.id
from public.sponsor_assignments sa
where sa.field_id is not null and sa.field_id in (select id from public.fields where venue_id = :venue_id)
  and not exists (select 1 from public.fields f where f.id = sa.field_id);

-- 4e. Amenities linked to a missing sponsor.
select 'orphan amenity sponsor' as issue, am.id, am.name
from public.amenities am
where am.venue_id = :venue_id and am.sponsor_id is not null
  and not exists (select 1 from public.sponsors sp where sp.id = am.sponsor_id);

-- 4f. Scoreboards / cameras / audio / maintenance pointing at a missing field.
select 'orphan scoreboard' as issue, sb.id::text from public.scoreboard_profiles sb
  where sb.venue_id = :venue_id and sb.field_id is not null
    and not exists (select 1 from public.fields f where f.id = sb.field_id)
union all
select 'orphan camera', cam.id::text from public.cameras cam
  where cam.venue_id = :venue_id and cam.field_id is not null
    and not exists (select 1 from public.fields f where f.id = cam.field_id)
union all
select 'orphan audio_system', au.id::text from public.audio_systems au
  where au.venue_id = :venue_id and au.field_id is not null
    and not exists (select 1 from public.fields f where f.id = au.field_id)
union all
select 'orphan maintenance_record', mr.id::text from public.maintenance_records mr
  where mr.venue_id = :venue_id and mr.field_id is not null
    and not exists (select 1 from public.fields f where f.id = mr.field_id);

-- 5. QR routing integrity ------------------------------------------------
-- 5a. Every field has a unique slug + qr_code_url pointing at its own id.
select 'qr url mismatch' as issue, id, qr_code_slug, qr_code_url
from public.fields
where venue_id = :venue_id
  and qr_code_url is distinct from ('https://gameday-os.vercel.app/fields/' || id::text);

-- 5b. Duplicate slugs (should be 0).
select qr_code_slug, count(*) as n
from public.fields where venue_id = :venue_id and qr_code_slug is not null
group by qr_code_slug having count(*) > 1;

-- 6. Layout-type coverage (expect Full, Split, Tournament, Practice) -----
select layout_type, count(*) from public.fields where venue_id = :venue_id group by layout_type order by layout_type;

-- 7. Session status mix (expect final / active / scheduled) --------------
select status, count(*) from public.sessions
where field_id in (select id from public.fields where venue_id = :venue_id)
group by status order by status;
