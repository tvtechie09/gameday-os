# GameDay Improvement 2.0B — First-Use Onboarding

## Current first-use audit

Venue authentication and account claiming already finish before the application shell renders. The login page sends Platform Admin and Venue GM users to Home (`/admin`), organization-scoped users to Organization Home, and frontline Venue Staff to Today (`/today`). The authenticated frame then builds navigation from the same capability catalog used by direct-route guards.

The simplified Venue nouns are strong but were previously unexplained. A new GM landing on Home sees current conditions and attention items, but may not know the durable distinction between Today (time), Fields (place), Schedule (future planning), and supporting tools under More. A Staff user lands closer to their job on Today, but Work Orders live under More and the reason Schedule is absent is not obvious. Existing empty states and Pilot feedback are useful in context; the old setup onboarding is an administrative venue-configuration flow and is not a reusable product tour.

## Implemented personas and mental models

- Venue GM: Today, Fields, Schedule, More.
- Venue Staff: Today, Fields, Work Orders, More.

Concepts are created only when the corresponding capability-filtered navigation item exists. Staff copy contains no Schedule, Reports, settings, or manager-tool guidance. Platform, organization, tournament, and public users receive no 2.0B orientation.

The surface is one compact responsive sheet. It is limited to four concepts, has an obvious **Not now** action, and sends either Venue role to Today after completion. No contextual tooltip tour was added because the primary orientation is sufficient. Existing empty states remain concise and unchanged.

## Completion, versioning, and revisit

There is no existing general account-preference service in Venue. Completion therefore uses a local-storage record scoped to authenticated user ID, product, and role. The record stores both `version: 1` and the outcome (`completed` or `dismissed`). A different user, a newly gained role, or a future version does not inherit the old result. Time away does not replay it. If browser storage is unavailable, the orientation remains dismissible for the current render and normal work continues.

**Getting Started** reopens the current role-aware orientation from the supporting navigation area; it is not a primary destination. Onboarding state never grants access and all destination availability continues to come from the existing capability model.

## Analytics and privacy

When Pilot telemetry is enabled, the existing best-effort collector accepts `onboarding_shown`, `onboarding_completed`, `onboarding_dismissed`, and `onboarding_reopened`. Metadata is restricted to the server-derived role, the Venue product context, onboarding version, and phone/tablet/desktop viewport. No name, email, venue name, query, record ID, or identity information is sent. Fetch or storage failure cannot block dismissal or navigation.

## Accessibility and responsive acceptance

The existing native-dialog sheet provides a labelled title/description, Escape handling, focus placement and restoration, and modal keyboard behavior. Every close/continue target is at least 44px. Essential meaning is text, not icon-only, and the implementation adds no motion or swipe requirement.

Acceptance widths: 320px, 390px, 430px, 768px portrait, 1024px landscape, and 1440px desktop. The sheet uses bounded width/height, wrapping two-column content, an internal vertical scroller only when needed, safe-area footer padding, and no fixed minimum content width.

## Automated and authorization coverage

Focused tests cover eligible first show contracts, completion and dismissal, version mismatch, user/role scoping, Venue GM content, Staff content, Staff exclusion of Schedule and management concepts, authenticated-shell placement, public exclusion, reopen, and non-blocking analytics. The full authorization suite remains the authority for direct-route access.

## Unassisted usability script

Give a new tester no product explanation. After the orientation, ask:

1. What do you think Today is for?
2. Where would you go to see what is happening at Field 7?
3. Where would you go to change a future game?
4. As Staff, where would you go to find work assigned to you?
5. How would you reopen Getting Started?

Pass when the tester answers Today, Fields, Schedule (GM), Work Orders, and More → Getting Started without coaching, and can dismiss or complete the sheet in about 30 seconds.

## Known limitations and 2.0C recommendation

Completion is device-local, so the same user will see version 1 once on each browser/device. Storage-blocked browsers cannot retain completion across reloads. No hosted authenticated usability session was performed as part of local implementation. For 2.0C, validate the script with fresh pilot users and add a server preference only if multi-device repetition proves material; do not build a training CMS or more tours without evidence.
