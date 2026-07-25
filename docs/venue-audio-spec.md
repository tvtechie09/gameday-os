# Venue audio — the control plane, not the source

**Status:** roadmap concept (from the USSSA Space Coast field research — every
small field had dormant speakers). NOT day-1. Later-phase, provider-ready
integration; validate against a real venue's audio rack before building.

## The reframe

The speakers at these complexes go unused not because the hardware is missing but
because **operating them is friction** — nobody's in a booth with a mic at a 10U
game on Field 6. That's a software problem. And the reason a parent's Bluetooth
setup can't fix it (walk-up music via Ballpark DJ, etc.) is that **Bluetooth has no
control plane**: 1:1 pairing, one device, manual, no time-box, no handoff, no
priority, no revocation.

**What we build is that control plane** — the answer to *"who may output to Field
6's speaker, right now, for how long, at what priority."* We do not play, host,
stream, or license the audio. We authorize and route it.

## Refined principle (supersedes "GameDay never touches audio")

> **GameDay OS is the audio control plane, not the audio source.** We authorize who
> may output to a field's speaker, when, for how long, and at what priority. We
> never store, stream, or license the audio content — announcements are
> text-to-speech or venue-provided clips; entertainment audio comes from the
> parent's own device/app. Music performance licensing (ASCAP/BMI) stays the
> venue's responsibility.

## One plane, three priorities

Operational and entertainment audio are not two features — one authorization layer
with a priority ladder:

1. **Safety** (lightning, evacuate) — always allowed, **interrupts everything**.
2. **Announcements** (delay, sponsor read, anthem) — staff, high priority, **ducks
   music**.
3. **Walk-up / entertainment** — the current game's coach/parent, **time-boxed to
   their game**, lowest priority.

**The priority ladder is the safety feature only a control plane can deliver.** If
walk-up music lives on a parent's Bluetooth speaker, a lightning warning can't cut
through it. On our plane, "clear the fields" automatically ducks/kills the music on
every field and takes over. This is the argument that earns a cautious, liability-
minded venue's yes — the walk-up music rides in behind the safety story.

## Transport: networked endpoints, not Bluetooth

Take Bluetooth out of the control path. Each field's speakers hang off a small
**networked audio endpoint** (~$50–150 receiver wired into the amp the venue
already has). "Send to Field 6" becomes a network action, not a pairing ritual.

- **Where it fits well:** complexes whose speakers already run to a press-box rack
  (USSSA-style) — the endpoint is a per-field module in the rack.
- **Where it doesn't:** dumb portable Bluetooth speakers — this doesn't escape their
  limits; don't pretend otherwise.

## Rotating access (the "new users every 2 hours" problem)

Solve it by making access a **time-boxed token you scan for, not a device you
pair** — reuses the field-QR + tokened-identity patterns we already have:

> Parent scans the Field 6 QR → GameDay OS confirms they're the coach/parent for
> *this* game → grants a cast token for the game window → they stream their own
> walk-up music to that field's endpoint → game ends, token expires, next game's
> parent gets it.

No pairing, no press box, no handoff scramble. Staff hold a standing
announcement/safety authority that outranks any entertainment token.

## Phases

- **Phase 1 — visibility (zero integration).** Extend the existing `audio_profiles`
  (speaker/PA readiness docs): surface "Field 6 PA: dead / unverified" in the
  attention queue. Pure trust-building; earns the right to ask for control.
- **Phase 2 — operational audio.** Push Command-Center announcements + storm/weather
  alerts to a field's networked endpoint (TTS or venue clip), staff-triggered
  (co-pilot). Safety priority interrupts. This is the core value + the safety wedge.
- **Phase 3 — entertainment routing.** Time-boxed cast tokens for the current game's
  parent to stream their own walk-up music, ducked by announcements.

## Two constraints that decide the architecture

1. **iOS won't let an app capture another app's audio.** If the parent plays their
   walk-up music in Ballpark DJ / Spotify, our app **cannot** grab and relay it. The
   only audio exit is the phone's OS-level output (Bluetooth/AirPlay/cast). So to let
   parents keep their own DJ app, **we control at the speaker end, not the phone.**
2. **Native casting (AirPlay/Chromecast) has no access control** — it broadcasts to
   the whole LAN; discovery is not permission.

Both force the intelligence into a device at the field — not the phone, not purely
the cloud. That device is the product.

## How a parent connects

The Field Audio Endpoint (per field, wired to the amp line-in) accepts audio only
when authorized, obeys priority, and reports health. Flow:

1. Parent scans the **Field 6 QR** in the app → we verify they hold the current
   game's DJ authorization → we tell the endpoint "accept this parent until the game
   ends."
2. The endpoint opens its input to **only them, only for that window.** Key move:
   **software manages the pairing lifecycle**, which rescues Bluetooth — the endpoint
   advertises a BT pairing *only* during the window and auto-forgets after. Bluetooth
   en masse fails because *humans* manage pairing; when *our software* opens/closes
   the window per field per game, the rotating-users and every-field-visible problems
   vanish.
3. Parent plays their own music → outputs to Field 6.
4. Safety/announcement arrives → the **endpoint** ducks/cuts locally and takes over
   (endpoint owns the mix, so priority is instant, no cloud round-trip). Token
   expires → endpoint stops accepting.

The parent never manually pairs or picks the right field — a QR scan hands them one
door that locks when their game ends.

## What the Field Audio Endpoint physically is

**No off-the-shelf box does all of this** — consumer cast receivers (WiiM, Apple
TV, Sonos) accept AirPlay/BT + have line-out but have zero authorization and no
priority ducking; commercial paging DSPs (Q-SYS, AtlasIED, Bogen, Barix) do
priority/ducking + have APIs but don't accept a parent's phone and are pro-AV
priced. The value (only-this-parent-this-field-this-game, safety always wins) lives
in the gap, which is software — so the endpoint must be **programmable**, not
purchased.

**The device = a small SBC appliance we build:** Raspberry Pi 4 / Pi Zero 2 W class
+ an audio-output HAT (line-out to the amp) + our agent. Transports via mature
open-source: Bluetooth sink (bluez), AirPlay (shairport-sync), Spotify Connect
(librespot). Our agent does what nobody sells: open/close the BT pairing window per
authorization, run the **local priority mixer** (PipeWire ducks/cuts the parent
stream for announcements — instant, on-box, no cloud round-trip), play TTS/clips,
report health, take OTA. BOM ~$60–150; the cost is firmware + fleet, not parts. It
registers as a new device *type* in `venue_assets`/`deviceCheck`.

**Two practical wins:** (1) **PoE** — one Ethernet run from the press-box switch
gives the endpoint power + a wired control link, no field power/WiFi needed for the
box. (2) **Bluetooth last-hop sidesteps bad field WiFi** — if the parent's phone
pairs to the endpoint over BT (in the software-managed window), the phone never
touches venue WiFi; the audio hop is local radio (parent's in the dugout, in
range), and only the endpoint's wired control channel needs the network.

**Two-tier (Pro Services decides per site survey):**
- Target market → install **our SBC appliance**.
- Big venues with existing pro paging (Q-SYS/AtlasIED) → **integrate with their DSP
  API** instead; our software becomes a control source. Less hardware, cheaper for them.

**Build path:** prototype the full loop on a Pi 4 + HiFiBerry DAC (authorize →
accept AirPlay/BT → duck for announcement) — a weekend, the OSS pieces are mature.
Productize later: smaller board, PoE HAT, outdoor-rated enclosure (fields = temp +
moisture), OTA fleet mgmt. The productization is the real work, not the demo. The
device is the moat *because* it can't be bought off a shelf.

## Pro Services offering (installed integration, a real revenue line)

Pure-software competitors (scorebug/streaming apps) can't touch this.
- **Site survey** — amp type, speaker wiring, field WiFi (often the real blocker),
  press-box rack vs. per-field boxes.
- **Endpoint install** — the Field Audio Endpoint per field, on the venue network,
  registered to the venue.
- **Config** — map endpoints→fields, set the priority ladder, set which roles grant DJ.
- **Monitoring** — the endpoint is a new device *type* in the model we already have
  (`venue_assets` + `deviceCheck` + `audio_profiles`); it surfaces in the attention
  queue when dark, like scoreboards/cameras today.
- **Revenue:** hardware margin + install fee + software tier. Fits "venue pays."

## "Field DJ" is a per-game authorization (we already have the engine)

It is the **same shape as a field reservation** — a time-boxed claim on a field
resource, where the resource is "the field's audio channel." Venue manager (or
coach) designates the DJ for a game; the parent claims/scans to activate; scoped to
that game, revocable; safety/announcements always outrank it. Reuses the existing
role + reservations model, not a new access system.

## Honest caveats

- Needs networked audio endpoints per field — a small venue-side capital/install
  ask; feasible where speakers already reach a rack, not with portable Bluetooth.
- Music licensing (ASCAP/BMI) is the venue's, not ours — we stay the router.
- Every venue's PA is a different franken-system. Design as a provider-ready
  integration once we can see a real rack; do not promise "we run your speakers"
  before that.

## The one discovery question that gates everything

**"How would someone make an announcement on Field 6 today?"** The answer (central
amp patched to all fields / per-field box / networked endpoint / nothing) tells us
whether integration is a clean networked-audio API or a physical bridge we grow
into.
