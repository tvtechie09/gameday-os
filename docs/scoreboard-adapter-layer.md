# Scoreboard Adapter Layer / GameDay Scoreboard Bridge

Tracking: GitHub issue #24, **Live State Platform 1.0 — real-time source authority, GameChanger + scoreboard ingest**.

## Existing foundation preserved

GameDay already has a Daktronics read-only bridge, normalized scoreboard readings, device/connection tables, admin adapter records, and a connected-game projection. This work extends those boundaries instead of replacing the Daktronics partnership path.

## Canonical state and event metadata

All adapters normalize to the shared scoreboard state: `homeScore`, `awayScore`, `inning`, `balls`, `strikes`, `outs`, `gameClock`, and the scoped `fieldId`. The envelope also carries `deviceId`, `sessionId`, provider, event and receive timestamps, optional sequence, and origin event ID.

The source-authority roles are `PRIMARY`, `SECONDARY`, `FALLBACK`, and `DISPLAY_ONLY`. Echoed origin IDs are ignored. A fallback feed is accepted only after an authorized takeover. Divergent primary states produce a conflict; the platform does not silently select one.

## Field device

`bridge/gameday-scoreboard-bridge.mjs` is the vendor-neutral bridge entrypoint. The first added provider is Fair-Play. It passively reads a controller output over serial or a serial-to-Ethernet connection, converts labelled character-generator output to canonical state, and sends absolute snapshots over HTTPS.

The durable outbox stores the newest absolute state with owner-only file permissions. On WAN failure it retries with capped exponential backoff; after a restart it reloads the unsent state. Absolute snapshots make reconnect safe without replaying blind score increments.

Provisioning requires a stable device ID, field ID, provider, endpoint, and device token. Cloud ingestion prefers device-scoped credentials in `SCOREBOARD_DEVICE_TOKENS`. Provider tokens remain a compatibility path for existing Daktronics deployments. Tokens are never logged.

The server binds every reading to the device's provisioned venue and field. A supplied field mismatch is rejected, and a supplied session must resolve to the same venue and field. The bridge cannot choose a different tenant scope merely by changing its payload.

## Standalone field-edge deployment requirement

The Scoreboard Bridge must be deployable at an individual scoreboard without a clubhouse, MDF/IDF, central baseball building, or venue-managed LAN. Frankfort Main Park is the reference pattern: each baseball field operates independently from scoreboard-local power and its own WAN path. The football building labelled `200` is not a baseball-system dependency. This is a reusable deployment pattern, not a Frankfort-specific product fork.

- Cellular LTE/5G is a first-class WAN option, with eSIM preferred where carrier coverage, serviceability, and hardware certification permit.
- Ethernet and Wi-Fi remain optional transports. Installers must be able to configure transport priority and failover (for example, Ethernet, then Wi-Fi, then cellular; or cellular-first for isolated municipal fields) without changing the scoreboard adapter.
- Each field remains independently operable. Loss, maintenance, or reprovisioning of one bridge must not interrupt any other field.
- WAN loss must not interrupt passive local capture. The bridge retains durable latest-state data, reports stale/offline status accurately, and reconciles absolute state with the cloud after connectivity returns without replaying blind increments or creating false authority changes.
- The device must phone home with remotely visible health and telemetry sufficient to diagnose power, controller-input, WAN transport, signal quality where available, last observation/delivery age, outbox state, software/adapter version, temperature/enclosure alerts where instrumented, and restart/error counts. Telemetry must not expose device secrets or unsupported manufacturer data.
- Field hardware assumptions must include a lockable outdoor weatherproof/NEMA-rated enclosure selected for the site's environment, protected cable entries, surge/lightning protection, condensation/temperature management, and service access. The final NEMA rating and thermal design are site-survey and electrical-engineering decisions, not a universal software claim.
- Power may be taken locally at the scoreboard only where the scoreboard manufacturer, applicable electrical code, the authority having jurisdiction, and a qualified installer/electrician permit it. The bridge must use an appropriately isolated, protected power supply and must not compromise the listed scoreboard assembly or warranty.
- Capture must be passive and fail-safe at or after the manufacturer's wireless receiver when that interface is documented or explicitly manufacturer-supported. The bridge must not transmit on, interfere with, or reverse-engineer a proprietary scoreboard RF link; an unsupported receiver/controller interface fails closed and remains marked unavailable.

Standalone connectivity is a deployment capability, not permission to bypass source-authority, tenant isolation, device-scoped credentials, or manufacturer support boundaries.

## Fair-Play support boundary

- MP-70 / MP-73: initial passive path targets documented controller/character-generator outputs such as RS-232. Exact sport layouts and serial settings require a controller data plate, rear-panel photo, configuration, and captured non-sensitive fixture from the field.
- MP-80: represented by the same Fair-Play adapter boundary, but its usable local output must be confirmed on the specific controller before it is marked supported.
- The bridge does not transmit or emulate Fair-Play 900 MHz RF.
- Unknown/proprietary frames fail closed. This slice does not claim generic raw MP protocol support.

## Bidirectional boundary

The adapter contract advertises input/output capabilities separately and retains origin correlation for loop prevention. Daktronics and Fair-Play remain input-only in this slice. Physical writes may be enabled only for a model/interface with manufacturer-supported documentation, field validation, an explicit source-authority rule, and a kill switch. Nevco and Electro-Mech are reserved provider keys with no falsely advertised live capability.

## Validation gates

1. Automated normalization, credential, authority, parser, and restart/outbox tests.
2. Synthetic bridge-to-preview acceptance with production untouched, including configurable network priority/failover and cellular-only operation.
3. Hardware fixture capture and parser verification for each controller/sport profile.
4. Bench verification of remote health/telemetry, durable buffering, process restart, WAN transport failover, and cloud reconciliation.
5. Onsite read-only acceptance, including scoreboard-local power review, enclosure/environment review, WAN loss/reconnect, per-field isolation, and conflicting GameChanger state.
6. Manufacturer/interface verification for passive capture at or after the wireless receiver; unsupported interfaces remain disabled.
7. Separate approval and validation before any physical control/output is enabled.
