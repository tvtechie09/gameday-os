# GameDay Venue Pilot Preview Launch 1.0

Status: validation in progress

This document is the evidence record for a protected, staging-backed pilot preview. It is not production approval.

## Pilot candidate baseline

- Baseline commit: `8a2df286ac3a4811070026286f2c1624fa1146da`
- Branch: `security/audit-remediation-2026-08-28`
- Accepted staging Supabase project: `oiyitfatarrhnussyxfu`
- Existing protected preview: `https://gameday-apz81ovom-gamedayos.vercel.app`
- Existing preview deployment: `dpl_zbJyHzGTWCCZrevQ4gycefrTTjBY` (READY at the 1.0D handoff)
- Accepted automated baseline: 563 tests, TypeScript, lint with one pre-existing warning, Webpack production build, and client-readiness passed.
- Production: out of scope and untouched.

Known non-blocking baseline limitations:

1. Staging migration history is reconciled forward rather than by replaying the repository history.
2. Protected preview authentication requires individually provisioned staging identities.
3. Optional weather coordinates are absent for the synthetic staging venue; the UI falls back safely.
4. Public field analytics count aggregate page views; they are not session replay or user tracking.

## Pilot scope and operating model

The pilot includes Venue GM, Venue Staff, and public/parent/fan experiences only. The operating model remains:

- Home: direction
- Today: what is happening
- Fields: where it is happening
- Schedule: what is planned or needs changing
- Work Orders: issue ownership and resolution
- Venue Status: whole-venue state

Command Center remains retired as a user-facing board. No new dashboard or persona is introduced.

## Instrumentation

The pilot reuses the existing server-side audit-log infrastructure for anonymous, aggregate product telemetry. Public field use continues through the existing `field_page_views` counter. No new analytics vendor or schema is introduced.

Tracked authenticated events are limited to:

- canonical screen opens for Home, Today, Fields, Schedule, Venue Status, Announcements, and Work Orders;
- field detail and disruption review opens;
- field action start/completion/failure;
- Work Order create, claim, acknowledge, start, resolve, and failure;
- game move start/completion/failure from disruption recovery;
- announcement flow open, publish, and failure.

Controlled context is limited to role, canonical source, action type, success/failure category, coarse duration bucket, viewport category, and the server-derived venue scope. Events do not contain names, emails, notes, announcement content, feedback text, phone numbers, tokens, secrets, raw errors, arbitrary referrers, or page state. Telemetry uses a null actor ID and cannot identify an individual user.

Telemetry is preview-gated and best-effort. Failed telemetry returns no internal detail and cannot change the result of a field, Work Order, game move, announcement, or page-load operation.

## Feedback mechanism

`More → Send Feedback` is available to Venue GM and Venue Staff. The form collects one controlled type (`confusing`, `bug`, or `suggestion`), an optional controlled screen, and a short feedback message. It deliberately does not attach the submitter's name, email, or actor ID.

The screen explains that product feedback is not an operational issue. Venue problems such as a broken scoreboard belong in Work Orders; difficulty finding or using the Work Order workflow belongs in Send Feedback.

## Pilot build identity

Vercel Preview deployments show a subtle `PILOT` marker and a `Staging Pilot · Build <short SHA> · Non-production` reference under More. The same panel shows the non-sensitive Supabase project reference parsed at runtime from the configured public project URL. The marker is enabled only when `VERCEL_ENV=preview` or the explicit server-only `PILOT_PREVIEW=true` flag is present. Production does not show it.

## Success thresholds

- Navigation: at least 80% of common tasks begin at the correct canonical destination without coaching.
- Core task completion: at least 90% complete successfully.
- Efficiency: most core tasks complete within 1–3 purposeful interactions after the user reaches the logical starting screen.
- Terminology: no repeated confusion around Today, Fields, Schedule, Work Orders, or Venue Status.
- Safety: zero cross-venue exposure, zero Staff access to manager-only capabilities, and zero false-success operational mutations.

These are pilot learning targets, not contractual service levels.

## Feedback severity

- P0 — Stop pilot: security boundary failure, cross-venue leak, destructive incorrect mutation, authentication outage, or data corruption.
- P1 — Major: core workflow unusable, Work Order lifecycle failure, repeated field-update failure, or Schedule change cannot complete.
- P2 — Friction: confusing label, unnecessary navigation, poor mobile layout, or unclear success feedback.
- P3 — Enhancement: shortcut, additional filtering, or cosmetic preference.

## Pilot change policy

During the pilot, changes are limited to P0 security fixes, P1 blocking fixes, narrow evidence-backed P2 fixes, copy corrections, and small layout/accessibility fixes. Do not add major workflows, dashboards, navigation redesigns, integrations, or speculative features mid-pilot.

## Stop conditions

Stop immediately for cross-venue data exposure, Staff gaining manager capability, unauthenticated private-data exposure, a mutation affecting the wrong venue/object, an incorrect operational audit actor, staging pointing at production, or credentials appearing in client/log output.

Pause for repeated 5xx responses on a core workflow, stale or incorrect field state, corrupt Work Order transitions, unsafe game movement, repeated session failures, or broad public-QR unavailability. One isolated cosmetic defect is not a stop condition.

## Security gates

Pending final deployed-preview verification.

## Workflow smoke

Pending final deployed-preview verification.

## Responsive acceptance

Pending final deployed-preview verification at 320, 390, 430, 768, 1440, and iPad landscape.

## Validation

Pending full tests, TypeScript, lint, production build, client-readiness, browser console, network, and runtime log checks.

## Pilot candidate

- Candidate commit: pending
- Protected preview: pending
- Staging project: `oiyitfatarrhnussyxfu`

## Known limitations

To be finalized after hosted acceptance.

## Recommendation

NOT READY FOR PILOT
