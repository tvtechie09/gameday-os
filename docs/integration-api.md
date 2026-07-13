# GameDay OS Integration API — Schedule Push v1

The connector rung above CSV import for leagues that keep their existing
scheduling/registration platform. The external platform (or a small sync
script) pushes games to GameDay OS; rows validate against real fields and
upsert idempotently by external id, so re-pushing the same schedule is safe.

## Setup

1. Set `SCHEDULE_PUSH_TOKEN` in the Vercel environment (any long random
   string; treat it like a password).
2. Give the token to the integrating platform/script.

## Endpoints

`GET /api/integrations/schedule` — capability check. Returns the list of
field names to map against and a payload example.

`POST /api/integrations/schedule`

Headers: `authorization: Bearer <SCHEDULE_PUSH_TOKEN>` (or
`x-gameday-integration-token: <token>`), `content-type: application/json`.

Body:

```json
{
  "source": "sportsengine-sync",
  "games": [
    {
      "external_id": "se-1234",
      "date": "2026-08-01",
      "time": "17:30",
      "field": "Field 1",
      "home": "Cubs 10U",
      "away": "Hawks 10U",
      "title": "10U House week 1",
      "sport": "baseball"
    }
  ]
}
```

- `field` matches a GameDay OS field by name (case-insensitive).
- `external_id` + `source` form the idempotency key: pushing the same id
  again updates the existing game instead of duplicating it.
- Up to 500 games per request.

Response:

```json
{ "ok": true, "created": 12, "updated": 3, "errors": [{ "row": 7, "status": "error", "error": "Unknown field \"Filed 1\"" }] }
```

## Notes

- Rows with unknown fields or unreadable dates are reported per-row and do
  not block the rest of the batch.
- Games created here appear everywhere sessions do: field QR pages,
  displays, the officials view, and (when linked to GameDay Team seasons)
  standings and family calendars.
