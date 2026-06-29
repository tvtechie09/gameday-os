# Crossroads Venue Model

Last reviewed: June 27, 2026

## Purpose

This document confirms that GameDay OS can model a Crossroads-style complex venue without hard-coding a pilot venue into the product.

Crossroads is used here as a venue modeling pattern:

- 9 full-size fields.
- 22 youth field configurations.
- A/B/C subfields.
- Venue map.
- Public venue page.
- Public field pages.
- Venue-wide operations alerts.
- Field-specific score/status.

## Venue Structure

Recommended hierarchy:

Organization
-> Venue
-> Zone
-> Parent Field
-> Field Layout
-> Play Surface
-> Session

## 9 Full-Size Fields

Each full-size field can be represented as a parent field:

- Field 1
- Field 2
- Field 3
- Field 4
- Field 5
- Field 6
- Field 7
- Field 8
- Field 9

Each parent field can have:

- public field page
- QR code
- field status
- map coordinates
- resources
- scoreboard/audio/display configuration
- sessions linked directly to the field when no subfield is needed

## 22 Youth Field Configurations

Youth configurations should be represented as play surfaces under parent fields.

Example:

Field 3 parent field:
- Field 3 Full layout
- Field 3 Split layout
- Play Surface 3A
- Play Surface 3B
- Play Surface 3C

Sessions can attach to:

- parent field only, for legacy/simple scheduling
- specific play surface, for subfield scheduling

This supports simultaneous youth games on 3A, 3B, and 3C while preserving Field 3 as the physical parent asset.

## A/B/C Subfields

Subfields should use:

- `fields.parent_field_id` for parent-child field relationships where needed
- `field_layouts` for full/split/temporary configurations
- `play_surfaces` for schedulable surfaces
- `sessions.play_surface_id` for surface-specific sessions

Recommended naming:

- Parent field: Field 3
- Full play surface: Field 3 Full
- Split play surfaces: 3A, 3B, 3C

## Venue Map

The venue map should support:

- venue-level `map_image_url`
- venue-level `map_notes`
- zone markers
- parent field markers
- play-surface markers
- QR entry points

The current Venue Mode page can display the map and overlay configured zones/play surfaces when coordinates exist.

## Public Pages

Public venue page should show:

- venue name and branding
- active venue-wide alerts
- today at this venue
- fields list
- field status
- current/next session by field
- sponsors
- resources summary
- venue map where available

Public field page should show:

- field name
- venue name
- current status
- active operations alert
- current/next game
- today's schedule
- sponsors
- field-specific score/status

Future play-surface-specific public behavior can use:

`/fields/{fieldId}?surface={playSurfaceId}`

## Operations Alerts

Venue-wide alerts:
- weather delay
- emergency
- parking
- concessions
- all clear
- facility closure

Field-specific alerts:
- field closure
- delay on one field
- moved game
- maintenance

For Crossroads-style complexes, urgent venue-wide alerts must appear above field/session content on both public venue and public field pages.

## Score And Status

Score/status can be tracked at:

- session level
- field level for field status
- play-surface level for future complex layouts

Manual scoreboard and public scoreboard display remain session-based today. The play-surface link gives enough context to route a game to the correct subfield.

## Validation Checklist

- Create one organization.
- Create one venue.
- Add venue map and map notes.
- Create 9 parent fields.
- Configure split play surfaces for applicable parent fields.
- Attach sample sessions to parent fields and specific play surfaces.
- Confirm Venue Mode shows surfaces and schedule grouping.
- Confirm public venue page shows field list and today's schedule.
- Confirm public field pages show field status and current/next game.
- Confirm Operations Center all-clear clears active delay/closure alerts.
- Confirm field-specific score/status remains visible on the correct field page.
