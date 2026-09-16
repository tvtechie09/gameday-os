# GameDay Venue UI/UX 1.1E — Pilot Usability & Reliability Hardening

Date: September 2, 2026

Baseline: `09d43dc3e340b34fe200125103c793470b9fcfbf`

Environment reviewed: Supabase staging `oiyitfatarrhnussyxfu` and the linked Vercel preview configuration. No production environment or production data was used.

## Executive decision

**NOT READY FOR PILOT**

The current code candidate is materially safer and simpler than the 1.1D baseline. Field status, game movement, Work Order, and announcement mutations now fail visibly, retain user context where practical, and refresh after stale writes. The 31-field Fields route uses bounded bulk reads, and shared accessibility/error behavior is stronger.

The hosted release gate is not yet clear. Staging has only one Auth-linked Venue GM, no real Venue Staff identity, no Work Order fixture, and a preview deployment older than this 1.1E candidate. More importantly, the hosted database still grants browser roles access to canonical Venue tables containing internal fields. A deny-by-default migration is included in this change, but applying privilege changes to the shared staging database requires explicit approval and was not performed. Until that migration is applied and its public/internal projections are rechecked, a pilot could expose data that the UI itself does not display.

This is a deployment/acceptance blocker, not a reason to broaden the product. The right next move is a narrow staging release gate, not another feature sprint.

## Preserved operating model

| Surface | Operator question | Decision |
| --- | --- | --- |
| Home | Where should I go next? | Keep as the GM direction surface. |
| Today | What is happening? | Keep as the time/current-state surface. |
| Fields | Where is it happening? | Keep as the place and first-response surface. |
| Schedule | What is planned or needs changing? | Keep as the GM planning/change surface. |
| Work Orders | Who owns the problem and what happens next? | Keep contextual/supporting; do not promote to primary navigation. |
| Venue Status | What is the whole-venue state? | Keep contextual/supporting; do not create another dashboard. |

No dashboard, offline subsystem, facilities platform, analytics platform, or major new capability was added.

## Pilot readiness scorecard

| Area | Rating | Evidence / limitation |
| --- | --- | --- |
| Auth | Not ready | One Auth-linked staging GM exists; a real hosted Venue Staff identity is absent. Sensitive preview server credentials are not downloadable, and the latest preview predates 1.1E. |
| Authorization | Ready with minor limitation | Route/action guards and direct-denial tests cover GM, Staff, unauthenticated, management-only, and cross-scope cases. Current hosted-role acceptance cannot be completed against the 1.1E candidate. |
| Home | Ready with minor limitation | Direction model and five-second hierarchy remain intact; current hosted mobile acceptance awaits an updated preview. |
| Today | Ready with minor limitation | Core read failures no longer become a false healthy empty state. Hosted poor-network behavior remains to be exercised after preview release. |
| Fields | Ready with minor limitation | Stale field writes are rejected, failures are visible, current/next reads are bulked, and public revalidation remains explicit. Hosted mutation acceptance is blocked. |
| Schedule | Ready with minor limitation | Remains the GM-only planning/change surface. Game-move errors stay in context and no raw provider/database error is rendered. Hosted move/reversal is not repeated in this sprint. |
| Work Orders | Ready with minor limitation | Claim, acknowledge, start, resolve, assign, escalate, and reopen retain concurrency checks and now handle transport failures. Staging has no Work Order record and no real Staff identity. |
| Venue Status | Ready | The existing whole-venue surface remains contextual and was not expanded into another dashboard. |
| Announcements | Ready with minor limitation | Removal and staff-only changes are explicit, confirmed, failure-aware, and use consistent naming. Hosted role/projection verification is pending. |
| Public QR | Not ready | Server projections remain intentionally simple, but hosted base-table grants must be revoked before public privacy can be accepted. The current preview is not the 1.1E candidate. |
| Mobile usability | Ready with minor limitation | Shared controls, sheets, destructive confirmations, and responsive wrapping are improved; a production-build matrix is required on the release candidate. |
| Accessibility | Ready with minor limitation | Skip navigation, a focusable content target, unique dialog IDs, focus restoration, alert/status semantics, larger controls, and stronger placeholder/disabled contrast are present. Full assistive-technology testing remains a pilot rehearsal task. |
| Weak-network behavior | Ready with minor limitation | Field, game-move, Work Order, and announcement paths now catch transport failure and avoid false success. Hosted throttling/retry acceptance is pending. |
| Error recovery | Ready | Errors are categorized as temporary, permission, missing, or conflict; operational reads fail to an error boundary rather than masquerading as empty state. |
| Performance | Ready | Fields uses one scoped field read plus bulk session/work-order reads rather than per-field queries. Existing 31-field deterministic coverage remains the scale gate. |
| Observability | Ready with minor limitation | Existing audit records remain canonical for operational mutations. Product analytics were deliberately not expanded because the current table is person-centric and broadly granted. |

## Workflow audit

### Venue GM

| Workflow | Usability finding | Tap / hierarchy finding | Hardening result |
| --- | --- | --- | --- |
| Sign in | Hosted staging can represent one real GM but not the complete release candidate. | Authentication should land on Home without an intermediate product chooser. | No auth bypass or new login path was added. Hosted acceptance remains blocked by preview/identity state. |
| Home | Existing direction model is the correct five-second answer. | Primary destinations remain one tap away. | Preserved; no competing dashboard added. |
| Today | A failed core read previously risked looking like an empty, healthy day. | Current work remains directly readable. | Core operational reads now fail to the route error boundary. |
| Fields | Field status changes were vulnerable to stale overwrite and failure feedback could disappear with a sheet. | Find a field, open context, act: generally two to three purposeful interactions. | Expected timestamps reject stale writes; conflict refreshes canonical state; errors remain visible in board/sheet context. |
| Field disruption / affected games | The recovery path is appropriately contextual to a field. | Abnormal field to disruption review is within the three-tap target from Fields. | Existing workflow retained; no new disruption surface. |
| Game move | A network failure could close the confirmation context or surface technical text. | Review remains before the consequential move. | Confirmation stays open on failure, pending feedback is localized, errors are human-readable, and affected projections revalidate on success. |
| Schedule | Correct home for future planning and movement. | Primary GM navigation keeps Schedule one tap away. | Preserved and still denied to Venue Staff. |
| Venue Status | Useful as supporting whole-venue control, not a second Home. | Available under supporting tools. | Preserved. |
| Announcements | “Alerts” and duplicate filters created naming friction; removal needed clearer consequence. | Compose and manage remain supporting tasks. | Visible heading is Announcements, duplicate type control removed, end/staff-only actions confirmed and failure-aware. |
| Work Orders / issue resolution | Worker actions could lose errors or notes when a request failed. | From Fields or supporting tools, common ownership/resolution actions remain contextual. | Input is retained, conflict/missing results refresh, transport failure is shown in the open workflow, and repeat submission is prevented while pending. |

### Venue Staff

| Workflow | Usability finding | Hardening result |
| --- | --- | --- |
| Sign in | No real hosted Staff identity exists in staging. | Documented as a pilot blocker; no synthetic identity was promoted as real Auth acceptance. |
| Today / Fields | These remain the correct two primary destinations. | Navigation is unchanged; Staff still has no Home or Schedule primary item. |
| Permitted field operations | Staff needs immediate, plain failure/conflict feedback outdoors. | Status failure is visible, stale state refreshes, and success is field-specific. |
| Announcements | Staff may publish only where capability allows; private/public consequence must be explicit. | End and “Make staff-only” require contextual confirmation. |
| Work Orders | The next action must be obvious and notes must survive a failed request. | Pending labels are localized; assignment ownership and management-only controls remain enforced; note/resolution text stays controlled. |

### Public parent / fan

| Workflow | Usability finding | Hardening result / limitation |
| --- | --- | --- |
| Public venue / field QR | Public users should only need venue, field, current/next game, and operational status. | Public UI remains simple and server-projected. The hosted canonical-table grants are a privacy blocker until the included migration is explicitly approved and verified. |
| Moved game | Movement must appear as authoritative location, not internal workflow language. | Existing revalidation includes old field, new field, schedule, Today, and public field routes. |
| Delayed / closed field | State must be readable without color alone. | Visible status text remains paired with color; error and disabled contrast were strengthened. |
| No games | Empty state should be calm and explanatory. | Existing public projection remains the correct location for the no-current/no-next state; hosted release-candidate acceptance remains pending. |

## Highest-value changes made

1. Added optimistic-concurrency protection to field status changes using the last authoritative `updated_at` value.
2. Kept field status, Work Order, game-move, and announcement failures inside the active workflow with plain-language retry guidance.
3. Prevented optimistic field success from appearing before the server confirms the change.
4. Preserved Work Order note and resolution input after transport failures.
5. Refreshed canonical state after Work Order/field conflicts and missing records.
6. Removed raw provider/database messages from operator-facing error paths while retaining server-side logging.
7. Stopped Today from converting core read outages into a false “nothing needs attention” result.
8. Replaced per-field current/next reads with one bulk session query and limited Work Order reads to the visible venues.
9. Added skip navigation with a focusable content target, unique dialog labels, dialog focus restoration, and correct alert/status live-region semantics without nesting page-level main landmarks.
10. Increased critical error/retry and dismiss targets and strengthened muted/disabled/placeholder contrast without changing the palette.
11. Simplified announcement management and added explicit confirmation for consequential state changes.
12. Added a deny-by-default staging migration for canonical Venue tables. It is committed code only until explicit hosted DDL approval is granted.

## Outdoor readability and touch ergonomics

- Status remains expressed by text as well as color.
- Placeholder and disabled-control contrast is stronger; disabled buttons remain visibly disabled without becoming unreadable.
- Shared error actions and global retry controls meet a practical 48px target.
- Toast dismissal is a 44px target.
- Primary card/sheet actions remain buttons rather than tiny inline links.
- Consequential announcement and game-move actions keep contextual confirmation; routine reversible actions do not gain unnecessary confirmation.
- Bottom sheets retain safe-area padding and scroll their content rather than clipping actions.
- No hover-only operational control was introduced.

## Accessibility acceptance

- Root layout has a “Skip to main content” link and a focusable neutral target; each page retains its own semantic `main` landmark without invalid nesting.
- Modal/sheet titles and descriptions use instance-unique IDs.
- Native `dialog` supplies modal semantics and focus containment; closing/unmounting restores the previously focused element.
- Mutation failures use `role="alert"`; neutral completion/status feedback uses `role="status"`.
- Icon-only close controls have accessible names.
- Error boundaries do not render raw exception messages or secrets.
- Shared layout permits content expansion rather than fixed-height text clipping.
- Reduced-motion rules remain global; no critical meaning depends on animation.

Large-text and real screen-reader acceptance should be repeated against the built release candidate at 100%, 125%, 150%, and 200%. The code inspection and automated contracts pass, but this report does not label unrun assistive-technology work as a pass.

## Weak-network, failure, and stale-state behavior

| Operation | Delayed / pending | Failure | Stale / concurrent |
| --- | --- | --- | --- |
| Field status | Localized updating label; repeat clicks disabled. | No optimistic success; human retry message remains visible. | Expected timestamp rejects overwrite, clears local override, and refreshes canonical state. |
| Game move | Confirmation remains active with localized pending state. | Network/provider text is replaced with actionable copy; retry remains available. | Existing schedule conflict handling tells the operator to review the latest schedule. |
| Work Order claim/acknowledge/start/resolve | Action-level pending label and disabled repeat submission. | Active note/input remains; sheet/card shows retryable error. | Version conflict or missing order refreshes the authoritative record/list. |
| Announcement management | Action-level pending state. | No false success; operator receives a plain failure message. | Server remains canonical and the relevant announcement routes revalidate after success. |

Full offline sync, service-worker mutation queues, and background conflict resolution remain explicitly out of scope.

## Loading, empty, error, and success states

- Core Today failure reaches a real error boundary instead of an empty-state lie.
- Temporary, permission, missing, and conflict failures have distinct operator copy.
- Error boundaries use “Try again” or a clear destination and log only server-safe context/digests.
- Success text names the action: field state, assignment, work started, work resolved, announcement state, or game movement.
- Existing loading skeletons and route-level boundaries remain preferable to global spinners; small mutations use localized pending labels.
- Existing empty-state vocabulary remains: no events, no matching fields, nothing needing attention, no open Work Orders, no active announcements, and no games found.

## Copy and status consistency

- The management surface is consistently named **Announcements**, not Alerts.
- Operator copy uses field, game, announcement, and Work Order terminology; no backend “entity,” “mutation,” or provider error is introduced.
- Field, game, Work Order, and severity labels continue to use the canonical visible state families established before 1.1E.
- Home, Today, Fields, and Schedule remain role-appropriate nouns; supporting tools remain under context/More.

## Three-tap and five-second findings

| Task | Logical start | Expected purposeful interactions | Result |
| --- | --- | ---: | --- |
| Find Field 9 | Fields | Search/filter, open field | 2; within target. |
| See Field 9 current/next | Fields | Search/filter, open card/sheet | 2; within target. |
| Report a field issue | Field context | Open issue/Work Order action, enter details, save | 3; within target. |
| Claim a Work Order | Work Orders or field context | Open order, “I'll take it” | 2; within target. |
| Resolve a Work Order | Open owned order | Resolve, add optional note, confirm | 2–3; within target. |
| Find a delayed game | Today or Schedule | Scan/filter, open game | 1–2; within target. |
| Review affected games | Abnormal field | Open field, disruption review | 2; within target. |
| Reach game movement | Disruption review | Choose affected game, move action | 2; within target. |
| Compose announcement | More / Announcements | Announcements, compose, publish | 3; within target. |
| Locate future game | Schedule | Search, open game | 2; within target. |

The five-second model remains sound: Home directs, Today explains time, Fields exposes abnormal places, Schedule owns planning/change, a Work Order presents its next state action, and Venue Status summarizes the whole venue.

## Performance findings

- The Fields route no longer performs one session request per field. It performs a scoped field read, one `field_id IN (...)` session read, and a venue-scoped Work Order read.
- No new polling was added.
- No new dependency or analytics bundle was added.
- Server authorization and scoping remain before projections; performance was not bought by weakening access checks.
- Existing deterministic 31-field tests cover natural ordering, filtering, abnormal-state visibility, and current/next projection behavior.

## Hosted staging Auth, RLS, and isolation evidence

The authorized project is `oiyitfatarrhnussyxfu` (`gameday-os-staging`, `us-east-2`). Read-only inspection found five fields, five sessions, four venues, three public users, three role assignments, and zero Work Orders. Eight Auth users exist, but only one approved Venue GM public user is Auth-linked; no real Venue Staff identity is available.

Read-only privilege checks found `anon`/`authenticated` grants on canonical tables. Examples included browser-readable session scorekeeper token/PIN and notes, announcement author fields, and venue emergency information whenever the corresponding permissive policy applied. RLS denied writes where no write policy existed, but RLS and SQL privileges are separate controls; broad grants remain unacceptable even when the current UI does not issue those reads.

`20260902170000_harden_pilot_public_base_tables.sql` revokes browser access from `sessions`, `alerts`, `venues`, and `field_work_orders`, revokes browser writes on `fields`, and retains `service_role` CRUD for server projections. Applying it was blocked by the external safety approval gate because it changes privileges on shared staging tables. It was not applied indirectly or through a workaround.

Therefore:

- correct-venue, second-venue, field, schedule, announcement, issue, and Work Order isolation remain strongly covered in local route/action tests;
- hosted 1.1E role mutations and second-venue denials are not accepted;
- hosted public privacy is not accepted until the migration is approved, applied, and verified;
- no staging or production record was mutated during this sprint.

## Browser, console, and live HTTP acceptance

The linked Vercel preview configuration was verified to target the authorized staging project, but sensitive server-only values cannot be pulled. The newest preview deployment points to an older commit, not this 1.1E candidate. A local development attempt was stopped after the host file watcher hit its open-file limit; no product mutation occurred. The current candidate was then built and served through the production Next.js path with explicit non-secret placeholders and the authorized staging URL override.

Current-code production browser acceptance passed at 320×700, 390×844, 430×932, 768×1024, 1024×768 iPad-like landscape, and 1440×900 on non-mutating Crossroads Today and public field QR surfaces. Each viewport had one page-level `main`, the skip target was present, and document/body width matched the viewport with no horizontal overflow. The public field route passed at 320, 390, and 430 widths for open/live, delayed, and maintenance states. Browser Back returned from surface 6B to Field 6, and no warning/error console entries appeared.

The mobile pass identified and fixed two real issues: public header/breadcrumb targets below 44px and nested `main` landmarks. The final 390px field route measured the skip link at 48px, brand/breadcrumb links at 44px, menu at 48px, and field-surface links at 44px.

Local live HTTP readiness passed with 200 responses for the Today demo, presentation, public venue, and public Field 6 routes, plus 307 authentication redirects for protected admin/demo/pilot routes. This proves current-code production routing, not hosted Auth/RLS or hosted mutation behavior. Hosted slow-network, large-text, authenticated back-navigation, and release-candidate console checks remain preview-release gates.

## Analytics decision

No workflow analytics were added. The existing `gdt_analytics_events` model is tied to a person/actor model and had broad browser grants in staging; adding Venue navigation events before its tenant/privacy contract is settled would create avoidable security and product debt. Operational audit records continue to cover state-changing accountability. A later pilot instrumentation change may add non-sensitive, venue-scoped events only after the table grant/RLS model and retention policy are explicitly approved.

## Remaining limitations

### Pilot blockers

1. Explicitly approve and apply the staging base-table privilege migration, then verify `anon`, `authenticated`, and `service_role` behavior.
2. Create or assign a real staging Venue Staff Auth identity through the normal identity workflow; do not use a dev-login fixture as proof of real Auth.
3. Provide one clearly disposable, venue-scoped Work Order fixture and a second-venue denial fixture.
4. Deploy this exact commit to a protected staging preview and run the complete role/mutation, responsive, large-text, slow-network, console, back-navigation, public QR, and live HTTP matrix.

### Post-pilot enhancements

- Minimal, privacy-reviewed workflow analytics if operator sessions show measurable hesitation or abandonment.
- Photo evidence for Work Orders only if real operators demonstrate that text cannot establish completion.
- More explicit preserved search/filter state if production browser sessions show real back-navigation loss.
- Offline read caching only if pilot connectivity data proves that graceful online failure is insufficient.

### Intentionally out of scope

- Full offline mutation sync.
- Photo evidence in 1.1E.
- SLA clocks, inventory, purchasing, parts, preventive maintenance, dispatch, or vendor portals.
- New dashboard, expanded Work Order platform, AI, or a new analytics platform.

## Validation record

- Automated tests: 547 passing (538 baseline plus 9 focused hardening tests).
- TypeScript: passed.
- Lint: zero errors and the unchanged `set-password-form.tsx` warning.
- Production build: passed with Next.js 16.3.3.
- Static client-readiness: passed.
- Local current-code HTTP readiness: passed for four public routes and three protected-route redirects.
- Responsive/browser-console acceptance: passed on the six required widths for non-mutating current-code demo/public surfaces; hosted authenticated/mutation acceptance remains blocked.
- Secret/data hygiene: no production access, no staging data mutation, no analytics payload, and no environment file is included in the diff.

## Release-gate recommendation

Do not start UI/UX 1.1F and do not deploy this candidate directly to production. Complete one narrow staging-release gate: approve/apply the privilege migration, seed legitimate disposable role fixtures, deploy this exact commit to preview, execute the matrix, reverse every operational mutation, and promote only if all public/internal projections and direct denials pass.
