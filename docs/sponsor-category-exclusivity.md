# Sponsor category exclusivity — spec

**Status:** roadmap, prospect-driven (a park district raised sponsorship terms on
2026-07-27; see `gamedayos-sales/sponsorship-one-pager.md`). Not day-one. Small and
well-shaped — this is the first sponsorship gap a real seller will name.

## The problem

"We want to be the **only bank** at this complex" is a standard sponsorship term. We
can't express it. Today `sponsors` carries name / logo / website / description and
nothing else, so there is no notion of what industry a sponsor is in, let alone
whether someone bought the right to be alone in it.

Two consequences:

1. **We can't stop the mistake.** Nothing prevents a venue from selling a second bank
   into a complex where a bank already holds exclusivity — a real breach of a real
   contract, discovered by an angry sponsor.
2. **We can't sell the upgrade.** Exclusivity is what justifies a premium tier.
   "$3,000, or $5,000 exclusive" is a common ladder. Not modelling it means the venue
   can't price it, which is revenue we're leaving on their table.

**This is a revenue feature that happens to also be a guardrail** — pitch it that way.

## Design (additive, no new tables)

Deliberately two columns rather than a new table: `types.ts` sits at TypeScript's
instantiation ceiling and adding a table collapses unrelated queries to `never`
(measured: 24 → 343 errors). Columns on existing tables are safe.

- **`sponsors.category`** (text, nullable) — the industry. Start with a small fixed
  vocabulary so conflict detection is reliable (free text can't be compared):
  `bank_financial`, `insurance`, `healthcare`, `dental_orthodontic`, `restaurant`,
  `auto`, `real_estate`, `retail`, `fitness`, `home_services`, `legal`,
  `youth_sports_retail`, `other`. Extend from real venues, don't guess more up front.
- **`sponsor_campaigns.category_exclusive`** (boolean, default false) — this campaign
  buys exclusivity for its sponsor's category, at the campaign's venue, for the
  campaign's date window. Scope and window come free: the campaign already carries
  `venue_id`, `starts_on`, `ends_on`.

Add both to `src/lib/supabase/types.ts` as **optional** Row/Insert/Update fields — a
required added Row field breaks row-mapping code (the lifecycle_status trap).

## Pure core (testable, IO-free)

`sponsor-exclusivity-core.ts`:

```
findCategoryConflicts({ sponsorCategory, venueId, startsOn, endsOn, existingCampaigns })
  -> Array<{ campaignId, sponsorName, category, startsOn, endsOn }>
```

A conflict is: an existing campaign with `category_exclusive = true`, the **same
category**, the **same venue**, and an **overlapping date window**. Overlap is
`startsOn <= other.endsOn && endsOn >= other.startsOn` — the standard interval test,
inclusive on both ends because campaign windows are whole days.

Rules worth pinning in tests:
- A sponsor **never conflicts with itself** (renewing your own exclusive is not a breach).
- A sponsor with **no category** can't conflict and can't hold exclusivity — surface
  this as a prompt to set the category, not a silent pass.
- **Non-exclusive campaigns never conflict.** Two banks can coexist if neither bought
  exclusivity; that's the venue's call, not ours.
- Exclusivity is scoped to **one venue**. A district with several complexes can sell a
  bank at each — do NOT silently make it org-wide. (Org-wide exclusivity is a real
  premium term; add it later as an explicit scope, not as a default.)
- **Adjacent windows don't overlap** (ends 6/30, starts 7/1 → clean handoff).

## Behaviour: warn, don't block

The venue is the counterparty to these contracts, not us. When a conflict is detected
on the campaign form:

> ⚠️ **Category conflict** — First National holds exclusive *Bank / Financial* rights
> at Crossroads through Aug 31. Selling this campaign would breach it.

Offer both paths — *Cancel* and *Create anyway* (recorded). A venue may have a side
agreement we can't see, and a tool that hard-blocks a deal gets worked around. Same
posture as the reservations engine: the DB refuses a genuine double-booking, but a
human judgment call stays human.

Also surface exclusivity where it's *sold*, not just where it's violated: mark held
categories on the campaign list and in Revenue Opportunities ("Bank/Financial —
exclusive, held through Aug 31" vs "Insurance — open, exclusivity available").

## Phases

- **Phase 1** — `sponsors.category` + the picker on the sponsor form. Nothing else.
  Immediately useful: the venue can finally see their book by industry, and it's the
  foundation both this and prohibited-categories need.
- **Phase 2** — `category_exclusive` on campaigns + `findCategoryConflicts` + the
  warning on the campaign form.
- **Phase 3** — sell it: exclusivity as a package upgrade with its own price, shown in
  unsold inventory as an available premium.

## Related, shares the same foundation

**Prohibited categories** (a park district's advertising policy — commonly no alcohol,
cannabis, gambling, political) needs the *same* `sponsors.category` field. Phase 1
unlocks both. Public entities will ask for the policy enforcement; private complexes
will ask for exclusivity. Build the category once.

## Not in scope

Per-field or per-tournament exclusivity (venue-level is what's actually sold at this
size), org-wide exclusivity as a default, and automatic contract-term tracking — we
don't model contracts, dates, or billing contacts on sponsors yet, and shouldn't
until someone asks.
