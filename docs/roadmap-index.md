# GameDay OS — Roadmap & Strategy Index

The forward-looking docs: what we're building next, how the hardware/services arm
works, how we sell it, and how we keep it safe. (Architecture/reference and
historical audit docs also live in `docs/` — see the end.) GTM sales assets live in
the separate `gamedayos-sales/` folder.

---

## Product & feature roadmap
Future features, each a build-ready-ish spec with phasing and open questions.

- [volunteer-hours-spec.md](volunteer-hours-spec.md) — parent volunteer-hours ledger
  (family = household via GameDay Team; org-side ledger; verification tiers). Prospect:
  New Lenox Baseball Association.
- [umpire-portal-spec.md](umpire-portal-spec.md) — officials see all their games + live
  running-early/late; tokened lightweight identity.
- [field-stream-integration.md](field-stream-integration.md) — bring-your-own field
  stream on the field page (orchestrate, don't broadcast; deep-link gatekept streams).
- [sponsor-category-exclusivity.md](sponsor-category-exclusivity.md) — "we're the only
  bank here": sponsor categories + campaign exclusivity with conflict detection. A
  revenue feature (premium tier) that doubles as a guardrail. Prospect-driven.
- [sponsor-prohibited-categories.md](sponsor-prohibited-categories.md) — enforce a
  venue's advertising policy (no alcohol/gambling/political near youth). Blocks by
  default with a logged override, and filters at RENDER so families never see it.
  Procurement-grade answer for public entities. Prospect-driven.
  - **Both sponsor specs share `sponsors.category` — build that once (Phase 1) and it
    serves exclusivity *and* policy enforcement.**

## Edge device program (hardware + Pro Services)
The physical layer — from off-the-shelf signage to the custom audio control plane.

- [edge-device-roadmap.md](edge-device-roadmap.md) — **the master sequence** (Phase 0
  today → signage → fleet → audio safety → Field DJ → scoreboard bridge → scale).
- [field-kit-spec.md](field-kit-spec.md) — the hardware catalog + BOM + the
  **custom-vs-off-the-shelf-by-role** architecture (start here for the device big picture).
- [venue-audio-spec.md](venue-audio-spec.md) — the one genuinely-custom piece: the audio
  **control plane** (safety > announcements > walk-up; the Field Audio Endpoint device).
- [pro-services-blueprint.md](pro-services-blueprint.md) — the services arm operating
  model (assessment → onboarding → install → managed; founder-led → kit → installer channel).

## Partnerships
- [partnerships.md](partnerships.md) — the posture (**a partner can be an integration,
  never a dependency**), the ~100-venue leverage trigger, the Zoom deferral with its
  rejected pieces and reasons, and the 4-question screen for the next pitch.

## Commercial & go-to-market
How it's priced, demoed, and sold.

- [pricing-and-packaging.md](pricing-and-packaging.md) — the model (free to record / paid
  to operate), subscription tiers, and the **Founding Venue Program** ($250/mo locked for life).
- [demo-walkthrough-20min.md](demo-walkthrough-20min.md) — the 20-minute demo script +
  production pre-flight.
- **`gamedayos-sales/`** (separate folder): `discovery-guide.md` + `discovery-notes-template.md`
  (running + capturing conversations), `venue-technology-assessment.md` (paid-discovery
  offering), `founding-offer.html`, `use-of-funds.html` ($350K pre-seed), `one-pager.html`.

## Security & operations
- [security-audit-2026-07.md](security-audit-2026-07.md) — the pre-launch security audit
  (anon-key posture, tenant isolation, IDOR sweep). A trust asset to hand a cautious board.
- [secrets-rotation-runbook.md](secrets-rotation-runbook.md) — ordered, zero-downtime key
  rotation + `SESSION_COOKIE_SECRET`.

---

## Suggested reading order
- **New to the product:** `gameday-os-product-architecture.md` → `pricing-and-packaging.md`.
- **A backer:** pricing → `pro-services-blueprint.md` → `use-of-funds.html` → `security-audit-2026-07.md`.
- **A hire (product/eng):** architecture → `edge-device-roadmap.md` → `field-kit-spec.md` →
  the feature specs.
- **Selling this week:** `discovery-guide.md` → `venue-technology-assessment.md` → `founding-offer.html`.

## See also (architecture & reference, not roadmap)
`gameday-os-product-architecture.md`, `crossroads-venue-model.md`,
`permissions-access-control.md`, `gameday-team-venue-integration-blueprint.md`,
`operations-center-roadmap.md`, and the historical audit/plan reports in `docs/`.
