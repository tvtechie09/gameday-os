# ADR: GameDay Provider Ownership and Product Boundary

**Status:** Accepted
**Date:** 2026-08-31

## Decision

GameDay integrates with sports technology providers; it does not replace them. SportsEngine, GameChanger, SidelineHD, SportsHuddle, TeamSnap, LeagueApps, PlayMetrics, Sprocket Sports, HomeTeamsOnline, and comparable systems retain the business functions they already own.

GameDay owns aggregation, cross-provider normalization, schedule-change intelligence, provider conflict resolution, Venue operations, field and venue status, Places, parking/POIs, venue announcements, Game Mode, the Tournament Family experience, Family calendar and notifications, physical-world Edge orchestration, source freshness, and safe provider launch points.

GameDay will not natively become a youth-sports payment processor, registration platform, detailed statistics/scorekeeping platform, streaming transport/CDN, or broad league-management replacement. The executable guardrail is `src/lib/product-boundary.ts`.

## Ownership matrix

| Capability | Ownership | GameDay behavior |
| --- | --- | --- |
| Schedule | Merged/resolved | Normalize provider data, retain lineage, honor explicit venue overrides |
| Team and roster relationships | Merged/resolved | Maintain minimum game-day associations; no provider enrollment replacement |
| Registration | Provider authoritative / link-out only | Open SportsEngine, LeagueApps, TeamSnap, or the configured provider |
| Sports payment | Provider authoritative / link-out only | Open provider account; no transaction or billing ledger |
| Scorebook and detailed stats | Provider authoritative / link-out | Open GameChanger, SportsHuddle, or another approved provider |
| Live score | Merged/resolved | Display authoritative provider or canonical venue/scoreboard state |
| Video stream | Provider authoritative / link-out | Resolve approved external/native venue source; no Family media pipeline |
| Tournament standings and bracket | Provider authoritative | Family reads canonical projections; it never calculates or mutates results |
| Venue/field status, parking, POIs, announcements | GameDay authoritative | Venue operates and publishes physical game-day context |
| Game Mode, Family calendar, notifications | GameDay authoritative experience | Aggregate and prioritize authorized canonical/provider context |

## Limited native score state

Venue's score pad records only scoreboard/display state—score, inning or period, outs, clock-compatible phase, and final status—for venues without an authoritative feed. It is a manual venue fallback, not a player-statistics engine, official scorebook, or GameChanger replacement. Provider-supplied score state retains lineage and may outrank the fallback under the documented resolution policy.

## Live and Edge

Watch, Listen, Scorebook, and provider media actions launch validated provider sources. Family receives no raw RTSP/RTMPS URL, Edge credential, or transport secret. The separately approved GameDay Private Viewing dance/studio pilot uses a customer-owned Cloudflare Stream account; GameDay provides entitlement and short-lived launch capability, not the underlying CDN product.

Edge remains venue-local orchestration: device health, scoreboard/device connectivity, automation, local administrative preview/recording, safe status projection, and explicitly gated pilot adapters. It is not a required GameDay CDN.

## Data minimization

Provider normalization retains only the identity association, schedule/team/event/tournament context, venue context, source lineage, freshness, and safe external actions required by GameDay. Card details, transaction data, medical answers, birth certificates, private waivers, bank data, full provider credentials, and unnecessary child contacts do not belong in normalized Family/provider domain tables.

## Engineering rule

Every new capability must declare ownership before implementation. A proposal for native youth registration, sports payments, detailed scorekeeping/statistics, or media transport/CDN work requires explicit product approval.
