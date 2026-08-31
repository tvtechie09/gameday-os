# Family Places 1.5A

Venue OS is the canonical owner of family-facing venues and points of interest. The sprint extends `venues`, `fields`, `venue_zones`, `play_surfaces`, and `amenities`; it does not create a Family copy of those models.

## Safe consumer contract

- `venue_public_summaries` contains only Live venue identity, arrival guidance, map/address, coordinates, public status, and timestamps.
- `venue_public_places` unions explicitly parent-visible fields, zones, play surfaces, and amenities under stable typed keys.
- Both views use `security_invoker=true`, revoke access from `public`, `anon`, and `authenticated`, and grant SELECT only to `service_role`.
- Family must authorize the signed-in guardian against their child/team events before querying venue IDs.
- Operational notes, location metadata, cameras, audio systems, devices, network details, endpoints, resources, and maintenance records are not projected.
- `20260831182046_protect_field_internal_columns_1_5a.sql` also removes raw browser-table SELECT from `fields` and restores column-level SELECT for the public allowlist. `resources`, `status_updated_by`, `operational_notes`, and `location_metadata` remain server-only.

## Publishing workflow

Venue managers use `/admin/venues/[venueId]/places` to publish existing canonical fields/zones/surfaces and add essential POIs. New zones and surface topology remain owned by the existing Venue hierarchy tools; this page is intentionally a small publication/configuration surface, not a second venue editor.

Location status supports an effective and expiry window. Family treats future and expired status windows as “Status not posted,” preventing a stale closure or weather hold from lingering as current.

## Release order

1. Apply `20260831173957_family_places_public_projection_1_5a.sql`, then `20260831182046_protect_field_internal_columns_1_5a.sql`, to the shared staging database.
2. Verify view columns, `security_invoker`, and effective grants.
3. Validate the Venue admin publication flow.
4. Deploy the Family application only after the Venue migration is present.
