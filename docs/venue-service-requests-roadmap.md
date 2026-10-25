# Venue Service Requests roadmap

Venue Service Requests is the shared Field Ops intake and lifecycle model for location-aware assistance. It carries venue, field, game/session, requester, priority, ownership, status, resolution, and append-only audit context. A request can also carry the cross-cutting `GAME_CANNOT_START_CONTINUE` operational-impact signal so the queue can escalate an interruption without creating a separate request type.

## Phase 1: user-facing

- `TRAINER_ASSISTANCE` is dispatch and notification only. It must not collect or provide medical diagnosis or treatment.
- `MAINTENANCE_FIELD_ISSUE` reuses the existing Work Order system for execution.
- Field and game/session context are prefilled from the field page and its QR destination.
- The public flow remains a 2–3 tap experience; optional requester and maintenance notes do not block submission.
- Maintenance supports `SAFETY`, `GAME_BLOCKING`, `NEEDS_ATTENTION`, and `ROUTINE`. The shared `GAME_CANNOT_START_CONTINUE` flag takes precedence for urgent routing.

## Phase 2: schema-ready, not user-facing

The shared request contract reserves these types without exposing them in the Phase 1 public form or create action:

- `SECURITY_ASSISTANCE`
- `TOURNAMENT_VENUE_DIRECTOR_ASSISTANCE`
- `OFFICIALS_ASSISTANCE`
- `TECHNOLOGY_AV_SUPPORT`
- `CUSTODIAL_FACILITY_SERVICE`
- `GAME_OPERATIONS_ASSISTANCE`

Enabling any Phase 2 type requires its own routing, ownership, permissions, notification, and acceptance work. No schema rebuild should be required.

## Engineering and release boundary

- Canonical request state lives in `venue_service_requests`; lifecycle evidence is appended to `venue_service_request_events`.
- Dispatch-oriented requests use `EN_ROUTE`; execution-oriented requests use `ASSIGNED`; both converge on `IN_PROGRESS` and `RESOLVED` as appropriate.
- Public callers submit only through the bounded server action. Direct anonymous and authenticated Data API access remains denied.
- Production remains untouched. Database migration and end-to-end role acceptance must run in an isolated development or staging environment before promotion.

Tracked in GitHub issue #26 and draft pull request #27.
