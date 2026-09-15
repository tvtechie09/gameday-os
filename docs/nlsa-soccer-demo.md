# NLSA private soccer demo

## Purpose and boundary

This is a private, synthetic demo tenant for New Lenox Soccer Association. It is an organization-level soccer operations walkthrough, not a production customer tenant and not a public showcase. No real NLSA member, player, coach, family, or SprocketSports data is stored in the fixture.

SprocketSports is presented only as a simulated, read-only source label. There is no live connection. The intended positioning is complementary: a league system remains the source for registration, teams, and schedules while Nurve Sports Operations normalizes source-attributed records for day-of owner, staff, coach, and family experiences.

## Routes

All routes require an authenticated, active canonical actor with the exact NLSA scope.

- Organization Owner: `/demo/nlsa/today`
- Organization Owner and League Staff: `/demo/nlsa/operations`
- Assigned Coach: `/demo/nlsa/coach`
- Assigned Parent / Guardian: `/demo/nlsa/family`
- Role-aware entry: `/demo/nlsa`

The scenario query is supported on every experience:

- Normal: no query parameter, or `?scenario=normal`
- Lightning hold and disruption: `?scenario=lightning`
- All-clear recovery: `?scenario=recovery`

## Stable staging fixture IDs

- Organization: `6e1a0000-0000-4000-8000-000000000001`
- Team scope: `6e1a0000-0000-4000-8000-000000000101`
- Family scope: `6e1a0000-0000-4000-8000-000000000201`
- Lincoln-Way Soccer Complex: `6e1a0000-0000-4000-8000-000000000021`
- Haines Wayside Park: `6e1a0000-0000-4000-8000-000000000022`

The checked-in staging seed creates the demo organization, two synthetic complexes, six soccer pitches, four public identity shells, and four least-privilege scope assignments. It does not create `auth.users`, set passwords, send emails, or create a live provider connection.

## Identity status and activation gate

The organization-owner identity shell is prepared for `president@newlenox.soccer`. Supporting QA shells use clearly synthetic `gamedayos.test` addresses. The normal Supabase invite must not be sent until the following have passed on the protected preview:

1. migrations and seed validate in the staging project;
2. normal hosted login links the invited Auth identity to the prepared public identity;
3. positive and negative authorization matrices pass for all four roles;
4. Crossroads and another tenant are denied by direct URL and object probes;
5. laptop, tablet, and mobile acceptance passes without horizontal overflow or critical runtime errors;
6. the customer-facing walkthrough contains no baseball-specific artifacts;
7. the provider boundary states that SprocketSports is simulated and not connected;
8. no personal Kyle credential is required.

The current identity service records and approves identity intent but does not send a Supabase Auth invitation. Use the established Supabase Auth invitation/provisioning process only after the readiness gate. Do not create an Auth row directly in SQL.

## Reset procedure

The primary walkthrough is read-only and deterministic. Reset any experience by navigating to its route without a scenario query parameter. For example:

`/demo/nlsa/today`

No database rollback is required because scenario changes do not mutate records. If future work adds mutable staging workflows, it must add a tenant-scoped idempotent reset and preserve an audit record.

## Eight-to-ten-minute Dion walkthrough

1. **Private boundary (30 seconds):** sign in normally and open `/demo/nlsa/today`. Point out the private-demo marker and NLSA-only scope.
2. **Owner answer (90 seconds):** show match count, open/held pitches, affected matches, attention count, and the single next-best action.
3. **Existing system fit (45 seconds):** show the SprocketSports source card. State clearly that this is a simulated source record and the platform complements rather than replaces SprocketSports.
4. **Normal Saturday (60 seconds):** scan simultaneous U8, U10, U12, and U14 matches across two complexes, referee coverage, and the damaged-net issue.
5. **Disruption (90 seconds):** select “Lightning hold.” Show Pitches 3 and 4 on hold, U12 Green moved from Pitch 3 to Pitch 5, the U12 Girls delay, and downstream U14 schedule pressure.
6. **Role-specific delivery (90 seconds):** open the coach and family experiences in their own authorized sessions. The coach sees only U12 Green; the parent sees “Go to Pitch 5,” kickoff, parking, restrooms, first aid, and concessions.
7. **Operational evidence (60 seconds):** return to Operations to show issues, staffing, audience-specific announcements, and append-only scenario history.
8. **Identity credibility (60 seconds):** show canonical person versus source identity, LINKED, POSSIBLE_MATCH, DISTINCT, keep-separate, provenance, and reversible linking without opening platform administration.
9. **Recovery and reset (45 seconds):** select “All clear,” confirm pitches reopen while the deliberate Pitch 5 move remains, then return to the base URL to reset to normal.
10. **Close (30 seconds):** summarize the value: one operational truth for owners, staff, coaches, and families without replacing the league’s existing registration system.

## Known limitations

- The primary walkthrough uses deterministic checked-in state. It demonstrates projections and role boundaries, not a live SprocketSports sync.
- Referee coverage is a read-only placeholder because a full officials-management workflow is outside this demo scope.
- The team and family scope IDs are canonical authorization scopes, but this demo does not create real rosters or family records.
- Sending the Dion invite remains gated on protected-preview hosted acceptance.
- No production deployment or production data mutation is part of this demo.

