# Pricing & packaging

**Status:** agreed direction (2026-07-14). Prices below are *anchors to validate*,
not committed numbers. Nothing here is implemented — see "Do not build billing."

---

## The principle

> **Free to record. Paid to operate. Rev-share to monetize.**

- **Recording the truth is free** — roster, registration, waivers, schedules, the
  Game record, families seeing their kid's stuff.
- **Operating a complex on game day is paid** — Command Center, attention queue,
  systems health, staff coordination.
- **Making the venue more money is the upside** — the Revenue Engine, where we can
  *prove* the ROI.

Why "free to record": our moat is owning the **permanent record**. Every record we
hold makes the platform stronger. Charging people to create records is charging for
the very thing that makes us valuable. We give it away, permanently.

---

## Who pays

**The venue pays. The league rides along. The family never pays.**

A 31-field complex running 72 games on a Saturday has staff, budget, sponsors, and
revenue. A volunteer-run 10U team has a parent with a clipboard. Only one of them
has a purchase order.

So the shape of the business is:

- **GameDay Venue OS = the paying product.** The Command Center makes the venue
  depend on us every operating day.
- **GameDay Team = the free network.** It's what pulls families and leagues in,
  feeds games into the shared record, and makes the venue unquittable.

The team app does not need to make money. It needs to make the venue impossible to
leave.

---

## What we charge for

### 1. Venue OS subscription — the ARR line

Tiered by **field count** (the honest unit of both size and value):

| Tier | Size | Includes |
|---|---|---|
| Single park | 1–4 fields | Command Center, public field pages, alerts |
| Complex | 5–12 fields | + officials, work orders, bookings/permits, storm response |
| Flagship | 13+ fields | + systems health, device integrations, multi-field ops |
| District | multi-venue | + cross-venue reporting |

**Anchor to test: $500–$2,500/month per complex.** Price against what they already
spend — staff hours, AV/scoreboard service contracts, and the cost of a blown
Saturday. Validate with a real GM before committing.

### 2. Revenue Engine — the line that sells itself

Either bundled into the top tier, or (preferred) **a percentage of sponsorship we
can prove we delivered.** We built Proof-of-Performance; it is literally the
receipt. "We're invoicing $X because we delivered and proved $Y of sponsor
inventory" is the strongest renewal conversation available to us, and it means **we
only win when the customer wins.**

**Hard constraint:** we *invoice against* their sponsorship revenue. We never sit
inside the sponsor's payment flow. No money custody, ever
(see `gameday-team-os/docs/payments-policy.md`).

### 3. League / club tier — the secondary line

For orgs running multiple teams: divisions & standings, compliance/verification,
registration at scale, season rollover (Continuity), Ops Assistant, the treasurer
console. Charge **per team per season**, or a few dollars **per registered player**.
Small, predictable, scales with their size.

---

## What is free — forever

- Everything family-facing: family dashboard, schedules, live scores, QR field
  pages, alerts, Family Hub, Data Passport.
- Public field pages / QR / live score — this is how families discover us *at the
  venue*.
- A single team's roster + registration — a coach can run a team for free. This is
  the wedge.

---

## The pitch that only works because we don't process payments

SportsEngine and TeamSnap make money by **sitting on the league's registration
payments** — skimming ~3% + fees off every family's card. That is the industry's
default.

We deliberately don't. Which gives us this:

> **"Keep your processor. Keep your money. Pay us a flat fee that costs you less
> than what they skim off your parents."**

The math: a league with 400 players at $150 is $60,000 of registrations. A 3% skim
is **~$1,800/season** out of families' pockets. We can charge a flat fee well under
that and still be *more* profitable per customer — because we don't eat processing
costs, disputes, chargebacks, or compliance.

**Deleting the payment rails wasn't only risk reduction. It's a sales weapon.**
We are the platform that doesn't tax your parents.

---

## What we will never charge for

These are guardrails, not preferences.

1. **Never per-family or per-parent seats.** Parents are distribution, not revenue.
2. **Never paywall safety.** Weather/storm alerts, field closures, incident
   response — free at every tier, always. Holding a lightning warning behind a plan
   tier is both wrong and a PR disaster waiting to happen.
3. **Never paywall the data or the export.** Data Passport and export stay free. If
   leaving us is expensive, we're a hostage-taker — and that destroys the "we own
   the record *for you*" trust the entire thesis rests on. **Charge for operating
   value, not for the data.**
4. **No per-game / per-API-call metering.** Park-district procurement wants one
   predictable annual number, not a usage bill.
5. **No payments rev-share.** Buried deliberately. It stays buried.

---

## Billing: visibility yes, payment processing no

The distinction that matters: we built billing **visibility**, not billing
**processing**.

**Built (2026-07-14, live) — `/admin/billing`:** GameDay staff record what an
org's plan is and issue invoices; the org owner sees their plan, monthly/annual
amount, what's outstanding, and what they've paid. Billed by **invoice / PO** —
no cards, no processor. It's the exact "track the money, never move it" posture we
use for league fees. `billing_accounts` + `billing_invoices` (org-scoped), pure
`summarizeBilling`, platform-staff write / org-owner read-only.

**Deliberately NOT built — card/subscription processing.** Park districts and
complexes pay by **invoice and PO**; most literally cannot pay by card. For the
first ~10 customers we **hand-invoice** and record it here. Wiring up card
subscriptions (which *would* be fine — being merchant for our **own** product is
normal SaaS, unlike the league-fee merchant-of-record liability we deleted) is a
later step, only once invoice volume actually justifies it. Building card
infrastructure for a customer count you can hold on one hand wastes a quarter.

Access model: **platform staff manage; the org owner (organization scope) views.**
A venue-scoped GM does not see billing — it's an account-holder concern, not a
per-venue one.

---

## What to validate next

Take the Command Center + a Revenue Engine Proof-of-Performance report to a real GM
(Wintrust Crossroads) and ask exactly two questions:

1. **"What would you pay for this per month?"**
2. **"What do you currently spend on the systems it replaces?"**

The gap between those two answers is our pricing — and it is worth more than any
amount of reasoning from inside the building.

**Load-bearing assumption to keep testing:** *the venue pays and the league rides
free.* If that turns out to be wrong, most of this document changes.
