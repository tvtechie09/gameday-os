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
