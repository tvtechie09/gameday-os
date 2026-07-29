# Prohibited sponsor categories — spec

**Status:** roadmap, prospect-driven (park districts raise their advertising policy
unprompted; see `gamedayos-sales/sponsorship-one-pager.md`). Sibling of
`sponsor-category-exclusivity.md` — **both need the same `sponsors.category` field, so
build the category once and serve both.**

## The problem

A park district is a public body, and its advertising policy is usually
board-approved: commonly no alcohol, cannabis, tobacco/vape, gambling, firearms,
political, or adult advertising anywhere near youth programming. A school district's
is stricter still.

We can't express any of it. Nothing stops a sponsor in a prohibited category from
being placed and rendered on a **public, family-facing field page**. That's not a
contract dispute — it's a compliance and reputational incident involving kids, and
the venue's own board approved the policy we just broke for them.

## Why this behaves DIFFERENTLY from exclusivity

Exclusivity is a commercial term between the venue and a sponsor, so we **warn and
let a human decide** — they may have a side agreement we can't see.

A prohibited category is **the venue's own rule about who may appear on their
property.** Enforcing it isn't us overriding them; it's us honoring what they told us.
And the failure is public, involves families, and can't really be taken back once a
parent has screenshotted it.

> **Exclusivity: warn. Prohibited categories: block by default, with an explicit,
> logged override.**

Not a casual "create anyway" button — an admin-level action that records who
overrode, when, and ideally why. Policies do have exceptions (a brewery that sponsors
the adult league but not the 8U field), so the door exists — it just requires intent
and leaves a trail.

## Enforce at RENDER, not just at entry

The lesson from the security work applies exactly: **the gate that matters is the one
closest to the output.** Entry-point checks are convenience; the render check is the
actual protection.

Four enforcement points, in increasing importance:

1. **Sponsor record** — allowed. A brewery can exist as a sponsor; it may legitimately
   back an adult league. Do not block the record.
2. **Campaign / assignment creation** — blocked by default (with override). This is
   where the venue is told, early, that the placement isn't allowed.
3. **Public render** — `getSponsorPlacementsForFieldPage`, the wall display, and the
   scoreboard filter prohibited categories out. **This is the safety net**: even if a
   record slipped in before a policy changed, families never see it.
4. **Proof-of-performance** — a filtered-out placement must not be counted as
   delivered. Silently billing a sponsor for impressions we suppressed would be worse
   than the original problem.

Point 3 is the one to build first if the work ever gets cut short.

## Design (additive, no new tables)

Same ceiling constraint as the exclusivity spec — `types.ts` is at TypeScript's
instantiation limit, so columns on existing tables, never a new table.

- **`sponsors.category`** — shared with the exclusivity spec. One vocabulary,
  two features. It needs to cover both *industries* (for exclusivity) and
  *restricted classes* (for policy): add `alcohol`, `cannabis`, `tobacco_vape`,
  `gambling`, `firearms`, `political`, `adult` to the industry list already proposed.
- **`organizations.prohibited_sponsor_categories`** (jsonb array of category keys).
  Policy is set by the governing body — a district sets it once for all its complexes
  rather than six times.

**Scope rule (later phase, don't build yet):** a venue may add categories the org
hasn't listed, but may never remove one the org prohibits. **Stricter down the tree,
never looser.** Ship org-level only in Phase 1.

## Safe defaults, visibly editable

A venue that never opens the settings page should still not show gambling ads to
families. So: at onboarding, pre-check a recommended youth-sports default —
`alcohol`, `cannabis`, `tobacco_vape`, `gambling`, `firearms`, `adult`, `political` —
**visible and unchecked-able**, not a hidden hard rule.

That respects the venue's authority (it's their policy, their call, plainly shown)
while making the safe path the default path. Adult-league complexes that want a
brewery sponsor simply uncheck `alcohol`. Do not enforce a secret list.

## Pure core

`sponsor-policy-core.ts`:

```
isCategoryProhibited(category, prohibitedList) -> boolean
filterProhibitedPlacements(placements, prohibitedList) -> { visible, suppressed }
```

Returning **both** halves matters: the venue's admin view should be able to show
"2 placements suppressed by your advertising policy" rather than having them silently
vanish, which is how a GM ends up confused about why a sponsor isn't showing.

Rules to pin in tests: an uncategorized sponsor is never auto-prohibited (prompt for
the category instead — a silent pass is bad, but so is blocking everything unlabeled);
an empty policy list prohibits nothing; suppressed placements never count toward
delivered in proof-of-performance.

## Phases

- **Phase 1** — `sponsors.category` + picker *(shared with exclusivity — do this once)*.
- **Phase 2** — org policy list + the onboarding default + block-with-override at
  campaign/assignment creation.
- **Phase 3** — the render filter on public surfaces + suppressed-count visibility in
  the admin view + proof-of-performance exclusion.
- **Later** — venue-level stricter-than-org additions; policy-change audit trail.

*If the phases get compressed, ship the Phase 3 render filter before the Phase 2 entry
checks. The public surface is what actually protects families.*

## Why this sells

For a public entity this is not a nice-to-have — it's the thing that lets a park
director tell their board "the system enforces our advertising policy automatically."
That's a procurement-grade answer. Pair it with the ownership message ("your inventory
stays yours") and the sponsorship conversation with a district becomes easy.

## Not in scope

Content review of individual creative (we're not moderating artwork), per-sport or
per-age-group policies, and any automatic classification of a sponsor's category —
a human picks it from the list.
