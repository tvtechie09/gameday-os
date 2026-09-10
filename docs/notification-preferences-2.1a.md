# GameDay Improvement 2.1A — Notification Preferences

## Decision

GameDay now uses two intentionally small recipient preference models rather than a shared marketing or workflow engine:

- Venue GM and Staff control their own venue-scoped in-app event inbox categories from **Your Account**.
- Parents and family viewers retain the existing relationship-scoped Family notification preferences in GameDay Team.
- Public field followers retain the existing token-bound `critical_only` or `all_updates` email preference.

Announcements remain operational records. A preference changes inbox visibility or recipient delivery; it does not delete, suppress, or rewrite an announcement.

## Current notification paths audited

| Path | Current state | Preference behavior |
| --- | --- | --- |
| Venue alert/announcement | Creates a Venue event-inbox record; public alerts can send follower email through Resend | Venue users can hide routine announcements in their own inbox; urgent alerts bypass opt-out. Follower email uses its separate token-bound preference. |
| Field status | Creates a best-effort Venue inbox record after the field mutation succeeds | `Field & Venue Changes` |
| Game/session status | Creates a best-effort Venue inbox record after the session event succeeds | `Game Changes` |
| Resource and volunteer activation | Creates a best-effort Venue inbox record | `Work Updates`; off by default for managers to reduce routine transition noise and on for frontline staff. |
| Work Orders | Lifecycle and audit exist, but no recipient-safe Work Order notification emitter exists | Not presented as an assignment-specific notification promise. Defer until authoritative assignee targeting exists. |
| Provider schedule change | Team/Family projection produces relationship-scoped, deduplicated in-app changes | Existing Family `critical`, `team`, and `community` controls apply. |
| Family reminders and updates | Existing relationship-scoped Family inbox | Existing in-app controls; critical cancellations/delays remain visible. |
| Public field follow | Token-bound follower preference and email delivery evidence | Existing `critical_only` or `all_updates`; not merged into authenticated account settings. |
| Push/SMS | No production delivery provider | Hidden. |

## Venue categories and defaults

Only the existing in-app channel is exposed.

| Category | Venue GM default | Venue Staff default | Events |
| --- | --- | --- | --- |
| Game Changes | On | On | Session/game status changes |
| Field & Venue Changes | On | On | Field status and venue-impacting changes |
| Work Updates | Off | On | Relevant resource and volunteer activity, not every internal transition |
| Announcements | On | On | Operational announcements |

Venue Tech Manager follows the Staff defaults. Platform and tournament roles only receive these controls while operating with an actual venue context.

Parent/Family defaults remain: critical in-app on and mandatory, team in-app on, community in-app off. Coach-specific notification controls are not separately implemented in the current Team product, so 2.1A does not claim a Coach preference matrix.

## Storage and authorization

`venue_notification_preferences` is keyed uniquely by the authenticated user, venue, category, and channel. Server code derives both `auth_user_id` and `venue_id` from the active session; neither is accepted from the form. A Venue GM cannot edit another person's settings. The table has forced RLS, no `anon` or `authenticated` table privileges, and service-role-only access through the tenant-filtered server service.

The same migration removes the legacy public read/create policies and browser grants from `notifications`. The event inbox continues to be read through the server and filtered to the active organization/venue scope before personal preferences are applied.

## Urgent behavior

Only records explicitly marked `urgent` bypass an in-app opt-out. Existing alert priority maps to this flag; routine, normal, and high-priority operational records remain preference-controlled. This is deliberately narrower than treating every alert as mandatory.

## Deduplication and failure separation

Venue notification records accept a stable `dedupe_key` and enforce uniqueness with notification type. Alert, field, session, resource, and volunteer emitters now provide event-derived keys. A duplicate insert fails inside the best-effort notification boundary and cannot duplicate the inbox record or roll back the operational change.

Family already uses stable schedule-change and venue-alert keys and conflict-safe insertion, so provider retries do not create a second Family notification. Schedule/field/work mutations remain authoritative even if notification persistence or delivery fails.

## Privacy and analytics

- Preference analytics contain only event name, role, venue scope, and a fixed action type. They never include notification bodies or preference owner email.
- Existing outbound email delivery evidence records status and provider metadata; notification messages should remain operationally minimal. Sensitive Work Order notes are not emitted.
- Safe event names are `notification_preferences_opened`, `notification_preference_changed`, and `notification_delivery_failed`. The first two are wired for pilot preview; delivery failure remains represented by existing delivery evidence until a general recipient delivery worker exists.

## Accessibility and responsive design

The Account form is a single-column native-checkbox list with full-row labels, 44px minimum primary action, visible status/error text, and no horizontal matrix. Its `max-w-3xl` container and responsive padding support 320, 390, 430, tablet, and desktop widths without document-level horizontal overflow. Browser viewport acceptance remains required after the migration is available in hosted staging.

## Deliberate deferrals

- SMS, push, and general authenticated-user email preferences: no supported delivery path.
- Quiet-hour scheduling: unjustified without a queued delivery worker and timezone policy.
- Organization-wide personal-preference administration: conflicts with recipient ownership.
- Work Order assignment/escalation notifications: requires authoritative recipient targeting and a noise policy.
- Separate Coach defaults/UI: the current Coach surface has no equivalent notification preference contract.
- A unified preference table across Venue, Team, and public followers: would blur tenant, relationship, and token security boundaries.

## Release gate

Apply and validate `20260910103000_notification_preferences_2_1a.sql` in staging before hosted UI acceptance. Verify zero browser-role table access, own-user isolation, cross-venue denial, urgent override, category opt-out, dedupe, and the responsive matrix. Production remains unauthorized.
