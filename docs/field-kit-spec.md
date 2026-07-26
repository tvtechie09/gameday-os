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
