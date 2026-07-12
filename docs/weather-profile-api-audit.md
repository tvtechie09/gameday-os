# Weather Profile API Audit

Date: July 8, 2026

Scope: GameDayOS venue platform only. DiamondOS / GameDay Team was not used for this fix.

## Summary

The production failure was caused by **missing implementation plus missing production schema/data**.

Findings:

1. GameDayOS had weather profile CRUD and manual weather operations, but no real weather API route/provider implementation.
2. Vercel production logs for `gameday-os` showed `weather_profiles` was missing from Supabase schema cache.
3. The connected Supabase project is `GameDayOS` (`ekkmflksqerdhutqxeii`). It contained GameDayOS venue tables and some `gdt_*` Team/Identity tables, which explains the misleading Supabase hint toward `gdt_team_profiles`.
4. `weather_profiles` has now been created in production with RLS enabled and no broad public write policies.
5. Existing production venue rows do not yet include latitude/longitude, and there are currently no weather profile rows.
6. Live provider calls will work after a venue weather profile has confirmed coordinates.

## Weather Files

Weather-related implementation now includes:

- `src/lib/services/weather-profiles.ts`
- `src/lib/services/weather-live.ts`
- `src/app/api/weather/route.ts`
- `src/app/api/weather/venue/[venueId]/route.ts`
- `src/components/weather/weather-status-card.tsx`
- `src/app/admin/weather/page.tsx`
- `src/app/venues/[venueId]/page.tsx`
- `src/app/fields/[fieldId]/page.tsx`
- `supabase/migrations/202607080001_weather_api_location_columns.sql`

## Provider

Supported providers:

- `national_weather_service`
- `openweather`

Provider selection:

- If `WEATHER_PROVIDER` is set, it wins.
- If a weather profile uses `national_weather_service`, the API uses weather.gov / National Weather Service.
- Otherwise the API defaults to OpenWeather.

## Environment Variables

Documented in `.env.example`:

```env
WEATHER_PROVIDER=openweather
OPENWEATHER_API_KEY=
WEATHER_API_KEY=
```

Production/Preview Vercel checks:

- `NEXT_PUBLIC_SUPABASE_URL` should point to the GameDayOS Supabase project `ekkmflksqerdhutqxeii`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` should belong to that same project.
- `SUPABASE_SERVICE_ROLE_KEY` should belong to that same project.
- If using OpenWeather, set `OPENWEATHER_API_KEY` in both Production and Preview.
- If using National Weather Service, no weather API key is required.

Note: this Codex session could inspect Vercel projects/logs but did not expose a safe env-var listing tool.

## Production Database State

Confirmed in Supabase:

- `public.weather_profiles` now exists.
- `public.weather_profiles` has RLS enabled.
- Row count is currently `0`.
- `public.venues` has optional `zip`, `latitude`, and `longitude` columns.

Current venue location issue:

- `Wintrust Crossroads Sports Complex` has address/city/state, but `latitude`, `longitude`, and `zip` were not fully populated before the fix.
- Weather API should use a `weather_profiles` row with confirmed coordinates.

## Error Handling Added

The API returns clear JSON errors for:

- `missing_venue_id` -> 400
- `venue_not_found` -> 404
- `missing_coordinates` -> 422
- `missing_api_key` -> 500
- `provider_failure` -> 502

Server logs now include structured context for missing API key, missing venue ID, missing coordinates, unsupported provider, and provider failures.

## Local Verification

Passed:

- `npm run lint`
- `npm run build`
- Local API smoke test: `GET /api/weather` returns `400` with `missing_venue_id`.

## Production Verification

Production runtime logs before the fix showed:

```text
weather_profiles table is unavailable; returning no weather profiles.
code: PGRST205
message: Could not find the table 'public.weather_profiles' in the schema cache
```

After migration:

- Table exists in Supabase.
- Production code still needs deployment for the new API routes and provider logic.
- A confirmed `weather_profiles` row must be created for each venue that should show live weather.

## Recommended Next Production Data Step

Create a weather profile for Crossroads after confirming exact coordinates:

```sql
insert into public.weather_profiles (
  venue_id,
  location_name,
  latitude,
  longitude,
  weather_source,
  status,
  notes
)
select
  id,
  'Wintrust Crossroads Sports Complex',
  <confirmed_latitude>,
  <confirmed_longitude>,
  'national_weather_service',
  'monitoring',
  'Confirmed venue weather monitoring point.'
from public.venues
where name = 'Wintrust Crossroads Sports Complex'
and not exists (
  select 1 from public.weather_profiles wp where wp.venue_id = venues.id
);
```

Using National Weather Service avoids a paid/provider API key and still provides real condition/radar/status data.

## Security Note

Supabase advisor also reported RLS disabled on several `gdt_*` Team/Identity tables and `public.scoreboards`. I did not change those tables because enabling RLS without policies can break access. This should be handled as a separate DiamondOS / Identity security task.
