# GameDay OS Field Kit

**Status:** productized hardware spec for Pro Services (2026-07-25). The physical
layer that turns a venue's dormant/disconnected infrastructure into a
GameDay-OS-connected system. The **Venue Technology Assessment produces the actual
quote**; this is the catalog it draws from. Prices are anchors to validate, not
committed — parts pricing moves and every site is different.

## Principles

- **The venue OWNS the hardware.** It's their infrastructure; we spec, install,
  configure, and monitor it. Not a lease we hold — same "it's yours" ethos as the
  data. If they leave, the gear stays theirs.
- **Orchestrate, don't broadcast.** We don't manufacture cameras/streaming; the
  venue brings their own or we recommend. See `field-stream-integration.md`.
- **PoE-first.** One Ethernet run per field = power + a wired control link, no field
  power or field-WiFi dependency for the device. Field WiFi is the biggest site
  variable (the assessment checks it first).
- **Everything registers as a device** in `venue_assets` / `deviceCheck` — so a dark
  endpoint shows up in the Command Center attention queue, like scoreboards/cameras.

## Edge device architecture: custom vs. off-the-shelf, by role

Don't think "the audio Pi" — think **a GameDay OS edge device that plays a role.**
The rule: **build custom only where there's a control plane to own; otherwise use
off-the-shelf.**

| Role | Hardware | Custom? | Why |
|---|---|---|---|
| **Audio Endpoint** | Pi + audio HAT + our agent | **Yes** | The value *is* the control plane (authorize who / when / priority); nothing off-the-shelf does it |
| **Signage Player** | Off-the-shelf player, or a Pi in kiosk mode | **No** | Just renders our web display; commodity |
| **Scoreboard Bridge** | Pi / serial-to-IP adapter | Light | Reads an existing controller into GameDay OS |

**Digital signage is not a custom build.** Our displays are already web apps
(`/display/venue/[venueId]`, scoreboard, field pages — with offline resilience via
`display-sw.js`). Signage = something that renders that URL on a screen and stays up:

- **Recommended for 24/7:** a **Chromebox** (Google kiosk management is excellent,
  zero-build) or a commercial signage player (BrightSign). **Avoid consumer sticks**
  (Fire TV / Chromecast) for always-on — they sleep, show ads, and auto-update at bad
  times.
- **Optional:** a Pi in kiosk mode (full-screen Chromium on the display URL) — worth
  it only to reuse one fleet system if you're already running Pi endpoints for audio.

**The unification is the management layer, not the hardware.** Pick the cheapest
reliable hardware per role, but manage them together: one fleet platform (Balena)
for the devices we install (OTA updates, remote terminal, health), and **every
device — custom Pi or off-the-shelf player — registers in `venue_assets` /
`deviceCheck`**, so a dead speaker and a dark screen both surface in the Command
Center attention queue.

**Rule of thumb:** reserve the custom Pi + agent for **audio** (where the control
plane earns it). Everything else is off-the-shelf hardware rendering software we
already own. See `venue-audio-spec.md` for the audio control-plane detail.

## Recommended off-the-shelf gear (deploy this before anything custom)

You can stand up ~80% of the platform with off-the-shelf gear + printed signs —
**zero custom hardware.** Do this first; go custom (the audio endpoint) only when a
venue commits to real multi-field audio.

| Need | Recommended off-the-shelf | Note |
|---|---|---|
| **Family experience** | Printed weatherproof **QR field signs** (~$40/field) | Zero electronics; best value/cost. Deploy day one. |
| **Network / field WiFi** | **Ubiquiti UniFi** — gateway + PoE switch + outdoor APs | Integrator-standard, cloud-managed. The foundation everything needs; field WiFi is the dealbreaker. |
| **Displays / signage** | **Chromebox** in kiosk mode (or the venue's smart-TV browser) | Renders our web display; reliable 24/7, zero build. Avoid Fire TV / Chromecast for always-on. |
| **Audio (stopgap only)** | A **WiiM** per zone (AirPlay/API + line-out) | Lets you demo "push an announcement from the Command Center." Has NO auth / priority / rotating-DJ control — that's why we go custom. Not the product. |
| **Streaming** | **BYO** — phone + tripod + YouTube, or a consumer AI cam (XbotGo-class) | We surface the URL; we never buy or build the camera. |
| **Scoreboard** | **Software first** — pull game state from their scorekeeping app (GameChanger/iScore) | Try the integration before a hardware bridge. |

**The point:** QR signs + a UniFi network + a Chromebox display + BYO streaming +
software scorekeeping = a fully-deployed GameDay OS venue with **no custom hardware**
— enough to validate the platform and the deployment motion before spending a dollar
on a custom build.

## The three tiers (aligned with the subscription tiers)

| Tier | What it adds | Unlocks |
|---|---|---|
| **Signal** (essentials) | Network backbone + QR field signs | Field pages, QR entry, alerts, manual scoreboards, follows, volunteer signup, reservations |
| **Connected** (flagship) | + Field Audio Endpoint (+ scoreboard bridge) per field | PA announcements, weather-to-PA **safety**, walk-up music (Field DJ), live scoreboard feed |
| **Broadcast / Command** | + camera/stream per field + venue wall display | Live stream surfaced on field pages, the big command/wall display |

## Bill of materials (anchor costs, hardware only — before install + margin)

### Venue core — once per complex
| Item | Purpose | Anchor |
|---|---|---|
| Managed PoE switch (8–24 port) | Powers + networks the field endpoints | $150–450 |
| Outdoor access point(s) ×1–3 | Field WiFi coverage (families cast/scan) | $180 ea |
| Gateway/router (if none) | Internet + network segmentation | $150–200 |
| Outdoor Cat6, conduit, mounts, misc | The install itself | $200–600 |
| **Venue core subtotal** | (varies hugely by existing network + field distances) | **~$700–1,800** |

### Per-field module — ×N fields
| Item | Purpose | Anchor |
|---|---|---|
| Weatherproof QR field sign | Families scan → field page / follow / volunteer / DJ | ~$40 |
| **Field Audio Endpoint** (Pi + audio HAT + PoE HAT + IP-rated enclosure + SD) | The audio control plane — announcements, safety, Field DJ (see `venue-audio-spec.md`) | ~$150–200 |
| Scoreboard bridge *(optional)* | Reads the existing scoreboard controller into GameDay OS | ~$100–150 |
| Camera + encoder *(optional / BYO)* | Stream source we surface on the field page | ~$200–600 |

### Venue command display *(optional, once)*
| Item | Purpose | Anchor |
|---|---|---|
| Player (mini-PC / Chromebox / Pi running the display PWA) | Drives the wall display | ~$120 |
| TV / monitor | The screen | $0 (BYO) or $300–600 |

## Sample quote — a 4-field park (hardware only, anchors)

- **Signal:** ~$900 core + 4×$40 signs ≈ **$1,060**
- **Connected:** Signal + 4×(~$175 endpoint + ~$125 bridge) ≈ **$2,260**
- **Broadcast:** Connected + 4×~$300 stream + ~$400 display ≈ **$3,860**

*(Plus Pro Services install labor + a modest hardware margin — or pass-through at
cost for founding venues. The assessment produces the real, itemized quote.)*

## Install & ownership

- **Delivery:** Pro Services (site survey via the assessment → install → config →
  train → monitor). Founder-led now, certified-installer channel later (see
  `pro-services-blueprint.md`).
- **Ownership:** venue owns the hardware; GameDay OS charges install + optional
  hardware margin (waived/at-cost for founders). Recurring is the software
  subscription, not a hardware lease.
- **Monitoring:** endpoints report health → attention queue.

## Honest caveats

- **Field WiFi is the swing variable.** A complex with no field connectivity needs
  more of the venue core (APs, cabling) — the assessment sizes it.
- **Camera/streaming is orchestration, not our hardware** — BYO or recommended; and
  never re-host a gatekept/paywalled stream.
- **The Audio Endpoint is later-phase** (validate the firmware + a real rack first);
  Signal + QR + network is deployable today and delivers the software value now.
