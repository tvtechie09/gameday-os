# GameDay OS Integration Framework Audit

## Weather Integration

Weather is already implemented and should not be duplicated.

- API routes: `/api/weather`, `/api/weather/venue/[venueId]`
- Services: `src/lib/services/weather-live.ts`, `src/lib/services/weather-profiles.ts`
- UI: weather admin setup, dashboard weather cards, public venue/field weather alert surfaces
- Environment variables: `WEATHER_PROVIDER`, `OPENWEATHER_API_KEY`, `WEATHER_API_KEY`
- Database dependencies: `weather_profiles`, venue location fields including latitude/longitude when available

The Integration Framework registers Weather as an existing provider and reports credential readiness. It does not replace the working Weather API.

## SportsEngine

SportsEngine is registered as an OAuth2 provider ready for real credentials:

- `SPORTSENGINE_CLIENT_ID`
- `SPORTSENGINE_CLIENT_SECRET`
- `SPORTSENGINE_REDIRECT_URI`
- `SPORTSENGINE_GRAPHQL_URL`

The framework does not fake a SportsEngine connection and does not generate mock SportsEngine events. Sync attempts fail safely with logs until OAuth and GraphQL access are configured.

## Security Rules

- Secrets must stay server-side.
- Client UI shows only configured/missing/masked states.
- Admin API routes require scoped Integration permissions.
- Webhooks are registered as placeholders and must not be trusted until validation is implemented.
- Coaches, parents, players, and fans cannot configure integrations.
