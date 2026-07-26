# Pro Services — blueprint

**Status:** strategy (2026-07-25, prompted by New Lenox Soccer feedback: "pro
services will be crucial"). Not a build; the operating model for the services arm.

## Thesis

The target orgs are **capital-rich and technically poor.** They'll spend $40K on
turf and lights, then run a scoreboard that talks to nothing, speakers nobody uses,
a gatekept camera, and field WiFi that doesn't reach the outfield. They have the
money and the will to modernize — they don't know how to make the pieces a system.

Our software is the system layer, but **the software is worthless if the install
underneath it is wrong.** Pro Services is the bridge that makes the SaaS adoptable
— and it does three things a pure-software competitor can't:

1. **Moat.** A scorebug/streaming app can't send someone to your press box. An
   installed, integrated, staff-trained venue doesn't get ripped out.
2. **Solves heterogeneity.** Every venue's AV/network is a franken-system; services
   is how we handle the custom 20% instead of faking plug-and-play.
3. **Trust + product research.** Onsite presence is the reliability signal a solo
   founder can offer, and it surfaces real needs faster than any survey.

## The offering ladder (lightest → heaviest)

1. **Venue Technology Assessment** — tip of the spear (`gamedayos-sales/venue-technology-assessment.md`).
   Survey fields/network/AV → a written roadmap: what you have, what's dormant, what
   to add, in what order, rough cost. Low-labor, high-value, and it *is* the funnel —
   an org that pays for the assessment has decided to modernize. Flat fee, credited
   toward onboarding if they sign.
2. **Onboarding / setup** — provision org/venue/fields (existing tool), configure
   integrations, train staff, stand up the first season. Remote + some onsite.
3. **Integration install** — the physical work: audio endpoints, stream sources,
   scoreboard bridges, QR signage, field WiFi. Hardware + hands. **Do NOT be the
   labor at scale** (see delivery model).
4. **Managed / ongoing** — device-health monitoring (already in
   `venue_assets`/`deviceCheck`), seasonal setup, a support tier. Recurring revenue.

## Delivery model over time (the part that matters)

Services is labor and the founder is one person, so the model must evolve:

- **Now — founder-led.** Kyle *is* Pro Services, onsite at the founding 3. Correct,
  not a limitation — best product research + relationship there is. The one job:
  **write everything into a repeatable playbook** (`onboarding-runbook.md` is the seed).
- **Next — productize the playbook.** A **Field Kit** (audio endpoint, QR signage,
  network spec, config checklist) + a **remote assessment** that's mostly knowledge
  work. One install contractor only when demand justifies it.
- **Later — certified installer channel.** Local AV / low-voltage integrators do the
  hands; we certify them, hand them the kit + playbook + software, take a
  margin/referral. We become the software + certification + kit provider; **the labor
  is a channel** (the Ubiquiti / Control4 / Toast model), not our trucks.

**Our specific edge: AI does the knowledge work, partners do the hands.** The
assessment report, integration plan, troubleshooting playbook, per-venue config —
exactly what solo-founder-plus-AI produces at high margin. We sell judgment and a
system, not the founder's calendar.

## Revenue

- Assessment: flat fee, credited toward onboarding on signing.
- Onboarding/setup: one-time fee (founding venues discounted/waived as part of the deal).
- Install: cost-plus on hardware + labor early; margin/referral once partner-run.
- Managed: SaaS tier or a paid add-on.
- All **venue-pays, never families** — same guardrail as the whole platform.

## Guardrails (hold these as CTO)

- **Software company with a services arm — NOT an AV install shop.** Services'
  gravity pulls toward becoming a low-margin integrator; that's the failure mode.
  Services exists to *pull software subscriptions and make them stick*.
- **Productize the common 80%, charge for the snowflake 20%.** The kit + playbook is
  the boundary that stops every venue becoming bespoke hell.
- **Watch the founder-time ratio.** Days onsite are days not on product. Worth it
  early (learning); offload the hands the moment the playbook exists.
- **Liability/insurance** (ladders, electrical, kids' facilities) is real — another
  reason to move to a partner-installer model as you grow.

## Plugs into what exists
Onboarding tool = setup half. `venue_assets`/`deviceCheck` = managed half. The
audio-endpoint + stream-integration specs (`docs/venue-audio-spec.md`,
`docs/field-stream-integration.md`) = the install catalog. The security audit =
a trust asset for a cautious board. The assessment doubles as paid discovery.

## Positioning
> "You invested in your fields. We make the technology actually work — assessed,
> installed, and running — so your staff and families feel it on day one."
