# Digital Venue Platform

Date: June 30, 2026

## Goal

Create the digital representation of an entire sports complex. Every physical object that matters to game-day operations can become a managed venue asset.

## Core Hierarchy

```text
Organization
  -> Venue
  -> Buildings
  -> Fields
  -> Assets
```

## Asset Registry

Durable infrastructure lives in `venue_assets`.

Asset examples:

- scoreboards
- displays
- TVs
- speakers
- audio zones
- cameras
- network equipment
- lighting
- parking signs
- Wi-Fi
- emergency devices

Asset fields:

- asset type
- asset category
- manufacturer
- model
- serial number
- IP address
- physical location
- map coordinates
- status
- integration status
- notes
- installation date
- warranty end date
- photos
- manuals

## Asset Categories

- Scoreboards
- Displays
- Audio
- Video
- Networking
- Lighting
- Infrastructure
- Miscellaneous

## Status Model

Operational status:

- healthy
- offline
- maintenance_needed
- unknown

Integration status:

- not_configured
- configured
- connected
- testing

Integration status is a placeholder only. No hardware commands, monitoring APIs, or vendor integrations are active in v1.

## Venue Map Integration

Assets can be pinned on venue maps with `map_x` and `map_y` percentage coordinates. This lets any venue map image become the base layer for a digital asset plan.

## Admin Surfaces

- `/admin/assets`: Asset Registry and health dashboard.
- `/admin/operations-center`: critical asset issues.
- `/admin/executive`: total assets, connected assets, offline assets, and maintenance items.

## Resources vs Assets

Resources are operational or public-facing capabilities such as cameras, audio, livestream availability, or scoreboards attached to fields.

Assets are durable physical infrastructure owned by the venue.

Examples:

- A scoreboard profile may reference a resource.
- The physical scoreboard itself should also exist as a venue asset.
- A parent livestream link is a resource activation, not a durable asset.

## Deferred

- hardware control
- vendor APIs
- automated diagnostics
- CMMS integration
- work order sync
- real-time device telemetry
- asset photo/manual upload flows

