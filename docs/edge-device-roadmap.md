# GameDay OS edge device — roadmap

**Status:** roadmap sketch (2026-07-25). The sequencing for the physical edge
program, from today (software done, no device) to a managed multi-role fleet.
Companion to `field-kit-spec.md` (hardware catalog + custom-vs-off-the-shelf
architecture) and `venue-audio-spec.md` (the audio control plane). Everything here
is **post-launch**; validate each phase with one real venue before productizing.

## Sequencing logic (why this order)

- **Ship off-the-shelf value before custom build** — signage before audio.
- **Build the management layer before scaling custom devices** — never deploy a
  device you can't update and monitor remotely.
- **In audio, do safety before entertainment** — weather-to-PA is the wedge that
  earns a yes and is simpler than rotating DJ authorization.
- **Every device registers in `venue_assets`/`deviceCheck` from day one** —
  monitoring is not bolted on later.
- **One real venue validates each phase** before it's productized.

## Phase 0 — Today (software, no device)
The web displays (`/display/venue`, scoreboard, field pages), QR entry, alerts,
storm automation, and the device model already exist. Families get the full
venue experience via QR with **zero hardware.** The edge journey starts from a done
software foundation.

## Phase 1 — Signage player *(off-the-shelf — fastest, lowest risk)*
- **Ships:** the wall/command display + field displays on real screens.
- **Build vs buy:** BUY — an off-the-shelf player (Chromebox / commercial / Pi-kiosk)
  renders our existing web display. Small build: a device pairing/claim flow (claim a
  screen to a venue with a code) + register it in `deviceCheck`.
- **Value:** the big board goes live; sponsor rotation on screens; the most visible
  "wow" for near-zero build.
- **Effort/risk:** LOW. **Gate:** none — deployable with a founding venue now.

## Phase 2 — Fleet foundation *(manage what we deploy)*
- **Ships:** remote management for every device we install.
- **Build:** the agent phone-home/health protocol + a fleet platform (Balena) for OTA
  updates, remote terminal, and monitoring. Shared backbone for signage + audio.
- **Value:** no site visits; push a fix to all venues from a dashboard.
- **Effort/risk:** MEDIUM. **Gate:** before any custom device scales.

## Phase 3 — Audio Endpoint: operational + safety *(the custom control plane)*
- **Ships:** PA announcements + weather-to-PA safety to the field.
- **Build vs buy:** BUILD — Pi + audio HAT + our agent (auth, TTS/clip playback,
  PipeWire priority mixer, health) on the OSS audio stack. The custom moat.
- **Value:** the safety wedge (lightning → "clear Field 6" out of Field 6's speakers)
  + operational announcements. Ties into the storm automation we already have.
- **Effort/risk:** MEDIUM-HIGH (prototype a weekend; productization is the work).
  **Gate:** Phase 2 done + a venue with speakers and a real rack.

## Phase 4 — Audio Endpoint: Field DJ *(entertainment)*
- **Ships:** walk-up music, parent-controlled, per game.
- **Build:** DJ authorization (reuses the reservations engine) + software-managed BT
  pairing window + cast-token-via-QR; ducked by announcements.
- **Value:** the family-delight feature; solves the rotating-users-every-2-hours problem.
- **Effort/risk:** MEDIUM (builds on Phase 3). **Gate:** Phase 3 + a venue that wants it.

## Phase 5 — Scoreboard Bridge
- **Ships:** automatic live scores (no manual entry).
- **Build vs buy:** LIGHT BUILD — a bridge role reads an existing scoreboard
  controller (serial/IP) → normalizes → feeds game state to field pages / displays /
  streams. Provider-ready per board type.
- **Value:** closes the scorekeeper-input loop; live scores everywhere for free.
- **Effort/risk:** MEDIUM, heterogeneous (each board differs). **Gate:** a venue with
  a bridgeable scoreboard.

## Phase 6 — Unify + scale *(the GameDay Node + installer channel)*
- **Ships:** one platform, many roles; the packaged Field Kit; a certified-installer
  channel.
- **Build:** consolidate roles onto a common provisioned "GameDay Node"; the install
  playbook + partner certification (Pro Services beyond founder-led).
- **Value:** repeatable, scalable deployment — the moat + services revenue at scale.
- **Effort/risk:** ONGOING productization. **Gate:** a few venues live + demand to
  scale past founder-led installs.

## Adjacent track (software, not a device we build)
**Streaming** — orchestrate, don't broadcast: attach a venue's own camera/stream to
the field page (`field.streamSource`) + sponsor overlay. Mostly software + BYO
hardware; it doesn't gate the device roadmap. See `field-stream-integration.md`.

## What we deliberately don't build
Cameras / CDN / OTT (we orchestrate streams, never re-host a paywalled one).
From-scratch firmware (we run Linux + our agent). A manufacturing operation (assemble
from off-the-shelf parts; partners install at scale).
