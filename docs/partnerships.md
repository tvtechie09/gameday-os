# Partnerships — posture and deferrals

**Status:** strategy note (2026-07-27). Captures partnership thinking that is
DEFERRED, plus the rules that keep a partnership from quietly becoming a
dependency. Kyle's call: revisit when we're much bigger.

## The rule that governs all of this

> **A partner can be an integration. A partner can never be a dependency.**

Every module offers built-in OR bring-your-own ([[gameday-product-principles]]).
Hard-wiring one vendor into alerts, streaming, or comms means their pricing change
breaks our product — existential for a small team. So: we integrate with what a
venue already owns, and we never route a core family-facing surface through a
single third party.

## The leverage rule (why timing dominates)

Platform/BD conversations are priced in **seats you bring**. At zero-to-three
venues the answer is zero, and a big partner's BD team knows it. Worse, a
partnership conversation *feels* like progress while carrying none of the rejection
risk of selling — which makes it most seductive exactly when we can least afford
the distraction.

**Revisit trigger: ~100 venues live.** Before that, partnership work is a
distraction from the founding cohort. After that, we have something to trade.

---

## Zoom — deferred (2026-07-27)

**The idea:** rather than "will Zoom stream youth baseball," pitch "GameDay OS is
the operating system for youth-sports facilities; be the communications and
collaboration layer inside every venue." GameDay = workflow layer, Zoom = comms
engine (the Salesforce+Zoom / ServiceNow+Zoom pattern, for sports). At scale, Zoom
co-sells us into parks, schools, and complexes; venues buy Zoom Phone/Rooms/Events
alongside us.

**Worth keeping:**
- The reframe itself — partner on *market access*, not on being our vendor.
- **Kyle's AV background is a genuine, rare edge**: Zoom Rooms, enterprise AV,
  digital signage, room scheduling. No other youth-sports founder can talk to a
  facilities director in their own language.
- **Zoom Phone at parks is the one plausible near-term piece** — front office,
  concessions, maintenance, tournament HQ. Park districts already carry a phone
  budget line, and "Field 7 needs maintenance" routing is a real workflow.

**Rejected, with reasons (do not re-litigate without new facts):**
- **Streaming via Zoom** reverses "orchestrate, don't broadcast"
  (`field-stream-integration.md`). It makes a core family surface vendor-dependent,
  and Zoom's per-seat/events pricing is wrong by an order of magnitude for 72
  Saturday games against a $250/mo venue subscription.
- **Zoom Voice calls for delay notifications** — we chose SMS/push deliberately. A
  robocall to parents is worse UX than a text AND carries more TCPA exposure.
- **"Zoom AI Companion generates highlights/commentary"** — AI Companion is meeting
  summarization attached to Zoom meetings, not a video-analysis API; "field camera →
  AI Companion" is not a real pipeline. It also pushes us into the media/content
  business we declined.
- **Most Zoom use cases die on field WiFi.** Zoom is bandwidth-hungry and youth
  complexes have poor connectivity — the dealbreaker the Venue Technology Assessment
  checks first. The "one-click rain-delay coach briefing" fails twice: bad WiFi, and
  40 coaches standing 50 feet apart will use a group text or walk over.
- **"Zoom subsidizes the integration"** is backwards at our size. Subsidies follow
  volume; at zero venues we'd be paying them.

**Where the AV edge actually monetizes NOW:** not through Zoom later — through
**Pro Services** today (`pro-services-blueprint.md`,
`gamedayos-sales/venue-technology-assessment.md`). "I know how to assess, install,
and integrate venue technology" is a revenue line we can sell this year. Zoom is the
wrong wrapper for our best asset; the assessment is the right one.

**Position to hold until the revisit:** support **Zoom Phone / Zoom Rooms as an
integration we work with, never depend on**. Parks and school districts already own
Zoom licenses, so "we work with what you've already bought" is free credibility with
a facilities director — and it's just the BYO principle, not a platform bet.

---

## How to evaluate the next partnership pitch

Four questions, in order. A "no" on any of the first three defers it.

1. **Does it stay an integration, or become a dependency?** (Dependency → no.)
2. **Do we have leverage yet?** (Under ~100 venues → not yet.)
3. **Does it survive the venue's physical reality?** (Field WiFi, field power, a
   volunteer operating it → most cloud-collab ideas die here.)
4. **Does it conflict with a documented principle?** No scoring/chat, no payments,
   families never pay, orchestrate-don't-broadcast, built-in-vs-BYO, control plane
   not content. If yes, the burden of proof is on the pitch.
