# Bring-your-own field stream — design sketch

**Status:** roadmap concept (from the USSSA Space Coast field research). NOT
day-1. Doubles as a talking point for any prospect with cameras on their fields.

## The insight

USSSA Space Coast runs a paid, proprietary stream (USSSALive, built by Skoresheet)
— one fixed camera per field, monetized by day/season pass, controlled end-to-end
because USSSA owns the complex AND sanctions the events AND keeps the revenue.
**Nobody in our target market has that.** A park district or local association has
a Daktronics scoreboard, maybe a parent's GameChanger stream, two speakers someone
wired up — and no layer that ties it together.

The competitors are all **point solutions**: Skoresheet/USSSALive (vertically
integrated), Pixellot/NFHS (fixed-camera OTT), BallerTV/BallerCam (travel ball),
GameChanger (scorekeeping + stream), KeepTheScore/ScoreLeader (cloud scorebug). Not
one is a venue operating system. That's the lane.

## The principle: orchestrate, don't broadcast

**We do NOT build streaming infrastructure** — cameras, encoding, CDN, OTT apps.
That's capital- and ops-heavy and a trap for a solo founder + AI. Instead:

> A venue attaches their **own** stream source per field; GameDay OS surfaces it on
> the public field page — branded, with their sponsors on it. We're the front door,
> not the broadcaster.

This is dead-on with the existing product principles (built-in vs. 3rd-party choice
on every module; co-pilot not autopilot; families never pay *us*).

## Model

- **field.streamSource** — a provider-ready integration on the field, right next to
  the Daktronics / GameChanger / SportsEngine placeholders: `{ provider, url,
  status }`. Providers: youtube, obs/rtmp-hls, pixellot, gamechanger, other.
- The **public field page** embeds the stream (or a "watch live" link) when a
  source is attached and the field's current session is live — reusing the
  game-state/scoreboard-feed the page already has for go-live timing.
- Nothing to operate: the venue owns the camera + the feed; we render + brand it.

## Phases

- **Phase 1** — attach a stream URL to a field; embed/link it on the field page,
  gated on a live session. (Small addition to the field model + field page.)
- **Phase 2** — sponsor overlay / adjacency: the venue's sponsor (from the sponsor
  engine) rides the stream surface. Streaming becomes sponsor **inventory**, not a
  cost — the money story for the venue.
- **Phase 3** — optional monetization passthrough: the venue may gate their own
  stream (free or paid) — their call, their revenue, rev-share to us. We never
  charge the family directly; we never hold the money.

## Why it matters commercially

- Reframes streaming from "expensive thing we can't afford to build" into "plug in
  the camera you already have, and we make it a branded, sponsored fan surface."
- Deepens the "OS" story: we orchestrate the point solutions (stream, scorebug,
  scorekeeping) AND own what they don't touch — field ops, alerts, reservations,
  sponsors, volunteer hours.

## Guardrail

We are the surface, not the pipe. If a prospect wants us to *be* USSSALive
(cameras + CDN + paywall), that's the wrong customer for this stage — say so.
