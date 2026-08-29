# Pilot Launch Operating Runbook

This is the operating standard for launching one GameDay Venue pilot. The product workflow at `/admin/pilot-launch` is the system of record; this document defines how the team uses it.

## Launch standard

A venue is approved only when:

- its venue profile, fields, upcoming schedule, public URL, primary operator, backup operator, and escalation path are ready;
- all six rehearsal steps contain passing evidence;
- no high or urgent support incident remains open; and
- the launch owner records an explicit approval before the venue is marked live.

Approval is not deployment. It is an operating decision for one venue and one planned date.

## Ownership

- Primary operator: owns Command Center, confirms changes, and publishes alerts.
- Backup operator: can take over the entire operating workflow without developer help.
- Escalation contact: decides whether to pause, fall back, or resume.
- Product lead: reviews evidence and recurring friction after the operating day.
- Developer: supports a recorded incident only after the venue team follows its escalation path.

Never launch with unnamed ownership or a support plan that depends on one person.

## Rehearsal

Run the rehearsal on the devices and networks staff will actually use:

1. Primary and backup operators sign in and see the correct venue.
2. Staff compare a schedule sample with its source, including field mappings.
3. A printed field QR is scanned over cellular data.
4. Staff publish a delay, verify it publicly, and issue the all-clear.
5. A follower receives an email alert, or delivery evidence explains the result.
6. Staff rehearse the escalation and fallback path.

Record evidence in the launch workflow. A verbal “it worked” is not enough for approval.

## Game-day sequence

Before opening, verify schedule, QR pages, emergency contacts, staff access, and the printed/manual fallback. During operations, use Command Center as the shared source for field status, schedule, and active alerts. Publish only confirmed changes and record incidents while evidence is fresh. At closing, clear expired alerts, assign every unresolved incident, and capture the most important improvement for the next date.

## Pause and fallback

Pause the pilot when staff cannot identify the correct schedule, cannot access the correct venue, a serious incident risks incorrect public information, public QR pages are unavailable without a manual alternative, or the backup cannot take over.

The minimum fallback is a printed schedule, radio or PA communication, and a manual field-status process. Record the failure and owner before resuming.

## Weekly product review

Review only metrics that drive a decision:

- games loaded and source-linked;
- QR views in the last seven days;
- alert delivery attempts and sent count;
- open incidents; and
- developer-required interventions.

Treat developer interventions as product evidence. Repeated interventions should create one prioritized fix, not another dashboard or another training document.
