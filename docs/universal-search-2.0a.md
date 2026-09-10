+# GameDay Improvement 2.0A — Universal Search

## Purpose

Universal Search is a permission-aware navigation accelerator. It finds a known operational object and opens the existing canonical surface; it is not a reporting engine, an identity directory, or a new object-detail system.

## Existing discovery audit

Before 2.0A, Venue Schedule used `src/lib/ui/session-search.ts`, with strong NFKD normalization, case/diacritic/punctuation tolerance, all-term matching, and server-side filtering after a scoped schedule load. Fields used a separate `fieldOperationMatchesQuery` plus a client-side `useDeferredValue` filter. Work Orders had status/field filters but no cross-object search. Identity Review had its own restricted administrative search and remains intentionally separate. No global command/search component existed.

Team/Family had page-specific filtering and selectors but no shared cross-object search. Team’s whole-state API already projected data by authenticated actor; Family used an even narrower durable Family access graph. Neither was an acceptable excuse to expose canonical people, contacts, identity review cases, or raw state rows.

Duplicated matchers differed in normalization and ranking. Client-side Field filtering could only find data already loaded on that screen. The Schedule matcher did not return a safe shared navigation contract. No implementation supplied deterministic cross-type ranking or one-tap global access.

## Supported result types

Venue supports Fields and Work Orders for venue operators, plus Games and session-exposed Teams for actors with Schedule permission. Team/Family supports scoped Team seasons, Team events, and roster Player domain objects already present in the authenticated projection.

Announcements are deferred: their message bodies and audience rules make a safe first-release search projection less valuable than the four operational types. Canonical people, contact details, Identity Review, GameDay Truth, audit records, private Work Order notes, provider identifiers, and years of history are excluded.

## Shared safe contract

Both repositories implement the same result contract: `type`, `title`, `subtitle`, `href`, optional `status`, deterministic `relevance`, and optional icon hint. The API never returns database/state rows. Search-owned detail pages do not exist.

## Authorization and isolation

Venue resolves the authenticated server session first. Queries are bounded and constrained to the actor’s authorized venue IDs before rows are returned. Venue Staff only receive Fields and permitted Work Orders. Games and session-derived Teams require the existing Schedule capability. Organization-shaped users receive no venue-operational search results. Destination guards remain authoritative after navigation.

Team resolves the verified Supabase actor, reads only that tenant’s state snapshot, checks existing team-data permission, and applies `projectDiamondStateForActor` before candidates are built. A Family-only actor therefore searches only their family-visible team seasons, events, and roster players. The optional `scope=family` request can only narrow routes/presentation; it cannot expand the server projection. Cross-organization state routing remains the isolation boundary.

## Ranking and normalization

Normalization uses NFKD decomposition, strips combining marks, lowercases, replaces punctuation with spaces, and collapses whitespace. All query terms must occur. A single digit is accepted for field-number lookup; other one-character searches wait for more input.

Ranking is deterministic: exact/space-insensitive title, exact identifier, title prefix, title partial, identifier partial, then secondary metadata. Current/active/upcoming objects receive a small boost. Type order breaks remaining ties. Venue history is bounded to the last 14 days plus upcoming rows in the bounded session source. Resolved and archived objects can match, but active/current objects rank first.

## Canonical routes

- Field → `/admin/fields?fieldId=…`
- Game → existing Schedule detail
- Work Order → existing Work Order detail
- Venue Team → existing Schedule with team query
- Team season → existing Teams or Family Calendar
- Team event → existing Team Events or Family Calendar
- Roster player → existing Roster or Family Calendar

## UX, accessibility, and context

Desktop exposes a visible Search GameDay control and Cmd/Ctrl+K; slash also opens search outside text inputs. Mobile exposes a one-tap header button and large sheet. Results are grouped with semantic labels, use at least 44px controls/64px rows, announce loading/errors, support Arrow Up/Down, Enter, and Escape, and restore trigger focus on close. Search query/results remain in the persistent shell. Opening a result closes the sheet; browser Back reopens it with the prior in-memory query and results.

The empty state is short and the error is always “Search is temporarily unavailable. Try again.” No SQL/provider details reach the browser.

## Analytics and privacy

Venue pilot telemetry records search opened, submitted, result opened, and no-result events only when pilot telemetry is enabled. Metadata is limited to server-derived role, coarse query-length bucket, result type/position, and existing safe context fields. Raw query text, names, contacts, identity IDs, and provider IDs are never logged. Team currently has no equivalent pilot event collector, so 2.0A adds no ad hoc persistence.

## Performance and indexing

Venue uses at most three bounded domain queries: scoped Fields, scoped Work Orders, and recent/upcoming Sessions for already scoped field IDs. Team searches a single tenant snapshot after its existing server projection. Ranking occurs server-side; clients receive at most 24 safe results. There is no N+1 lookup, broad browser filtering, full Work Order history, or canonical identity join.

No migration or speculative full-text/index infrastructure is added. Current pilot volume and bounded source limits do not justify it. Query latency and truncation should be measured before choosing trigram/full-text indexes.

## Usability script

1. Find Field 7.
2. Find the Semifinal.
3. Find the scoreboard Work Order.
4. Find the Celtics.
5. Search for something that does not exist.

Observe whether search is found without instruction, the first chosen result is correct, category labels make sense, taps decrease, users expect another object type, and the canonical destination is understood.

## Responsive acceptance matrix

Exercise widths 320, 390, 430, tablet portrait, tablet landscape, and desktop. Verify no document-level overflow; visible input above the software keyboard; large tap targets; long titles wrap; no-result and failure states remain readable; keyboard focus/selection works; and Back restores search context.

## Known limitations and 2.0B recommendation

2.0A intentionally does not search announcements, venue-linked Family games that are not present in the Team projection, private notes, historical archives beyond the bounded operational window, or canonical people. Search routes Team/Family results to canonical list/calendar context; those destinations may not yet auto-scroll to every query-param object.

For 2.0B, measure anonymized result-type success and no-result rates, then add canonical destination focus/scroll support and—only if measured latency/data volume requires it—targeted database indexes. Keep identity administration separate and do not add AI/embedding search.

