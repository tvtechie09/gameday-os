# Volunteer-hours tracking — design sketch

**Status:** prospect-driven roadmap candidate (New Lenox Baseball Association
raised it). NOT day-1 launch. This is the settled thinking; the concrete shape
waits on five discovery answers (bottom). Doubles as a "yes, we can do this"
leave-behind for the prospect conversation.

## The problem

Many youth associations require each **family** to work a set number of volunteer
hours per season — fields, concessions, clean-up, scorekeeping, board duties —
with a buyout ($ instead of hours) and/or a refundable deposit check. Today it
lives in a shared spreadsheet or a clipboard on the concession counter. Nobody
trusts the numbers, and the board spends the last month of the season chasing
people. **The pain is tracking + verifying + nagging, not signup.**

## The one insight that matters: family = household, not player

The requirement attaches to a **household (the shared parent[s])**, not a player.
A family with two kids on two teams owes **one** obligation, not two. Get this
wrong and a 3-kid family owes 3× the hours — an instant credibility killer.

## Identity — already solved, don't rebuild it

Family identity is **authoritative in GameDay Team** (`gdt_players` / `gdt_people`
/ guardian relationships): each player is assigned to parent(s). We derive the
household by grouping players under shared guardian(s) — the **parent is the join
key**.

- The venue/org app **reads** team state through the existing snapshot bridge
  (`gameday_os_state_snapshots`, the same path `getTeamDivisions()` uses). It
  **never writes** the team store.
- The **hours ledger is org-side** (venue app, org-scoped — the association is an
  *organization*, the tenant model already hardened). It references a household
  key resolved from the snapshot and owns hours, categories, approvals, balances.

Split: **Team app owns the family; the org app owns the labor ledger and points at
families by household key.**

## Data model (org-side)

- **household** — resolved from the team-app guardian graph; the unit the
  requirement attaches to.
- **requirement** — org sets "N hours per household by [date]", optional buyout $,
  optional refundable bond.
- **opportunity / shift** — categorized, time-bounded, with capacity (Concessions
  Sat 9–12, needs 3). Categories: fields, concessions, clean-up, scorekeeping, board…
- **hours_entry** — hours credited to a household, with category + **verification
  status** (self-reported → coordinator-approved) + audit trail (who/when).
- **ledger** — approved hours vs. requirement per household; buyout/bond status.

## Verification is the product (three tiers, in build order)

1. **Coordinator check-off** — a shift lead marks who showed and for how long.
   Lowest friction, most trusted.
2. **QR clock-in/out** — a shift has a QR (reuses our field-QR infra); parents
   scan in/out, hours auto-calc, coordinator confirms the shift.
3. **Self-report + approve** — family logs it, coordinator approves/disputes.

An audit trail is mandatory — families *will* dispute "it says 2, I did 3."

## Phases

- **Phase 1 — the ledger (MVP).** Org sets the requirement; coordinators log +
  approve hours by household and category; families see their balance; board gets
  a "who's short" report + treasurer CSV export. Replaces the spreadsheet even with
  zero self-serve signup. Family view = a tokened magic link (the officials
  pattern) — ships without touching the team app.
- **Phase 2 — shifts + signup.** Categorized opportunities with capacity, family
  self-signup via the **existing reservations engine** (FCFS + approval + atomic
  claim constraint, already built + tested), QR clock-in/out.
- **Phase 3 — automation.** Balance reminders (gated on the SMS/TCPA work),
  buyout/bond **status** tracking, graduate the family view into the GameDay Team
  family hub.

## Guardrails (hold these firm)

- **We never touch the money.** Buyout and refundable bond flow org↔family. We
  track *status* ("bond held / hours complete / buyout owed / paid") so the
  treasurer acts; we do **not** process the payment (Stripe/payments ban;
  "families never pay *us*").
- **Don't build a cross-app identity dependency for the MVP** — start with the
  household roster read from the snapshot + a tokened family view; integrate deeper
  with the team app only once it earns its keep.

## How much we already have (why it's tractable)

`volunteer_roles` (the per-game signup just wired onto the field page) is the seed;
the reservations engine is the shift-signup engine; field-QR infra is the
clock-in; the officials tokened-identity pattern is the family view; the sponsor
report CSV is the treasurer export; the org tenant model is the boundary.

## Open questions (fill from discovery — see gamedayos-sales/discovery-guide.md)

1. Requirement per **family/household**, per player, or per parent? How many hours?
2. **Buyout** ($ instead of hours) and/or **refundable deposit/bond**? Amount?
3. **Who verifies** hours today, and how?
4. What **categories** count? Deadline / penalty?
5. What do they use **today** to track it? *(The thing we replace.)*
