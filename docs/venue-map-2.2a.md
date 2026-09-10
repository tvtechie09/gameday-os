# GameDay Improvement 2.2A — Simple Venue Map

## Implemented model

Venue already owns an optional static `map_image_url`; fields already own normalized `map_x`, `map_y`, and `map_label` values constrained to 0–100. This sprint reuses that truthful configured data. It does not geocode addresses, infer coordinates, or introduce GIS/CAD dependencies.

The canonical **Fields** surface now offers `List | Map`. List remains the default and accessibility fallback. Map uses the same bulk field/session/Work Order projection as the list—there is no request per marker. Each configured marker contains field name and textual status and opens the existing field detail sheet. Current/next game context remains in that canonical sheet, and all mutations remain in existing field/disruption workflows.

If a diagram or markers are missing, the interface says so and returns the operator to the complete list. Partially configured venues disclose how many fields lack markers.

## Public boundary

The existing public venue map now has tappable 44px field links with textual public status. It links to the canonical public field page and never loads Work Orders, issue text, device health, or internal controls. The existing Fields list remains immediately above the map. The prior 520px minimum canvas was removed so the page does not force document-level horizontal scrolling on phones.

POIs, live navigation, directions inside the complex, marker dragging, and a venue-directory CMS are deferred. Existing modeled POIs live in the separate Venue Mode/Digital Experience domain and are not mixed into the core public projection without a unified public-safety contract.

## Acceptance and release gate

Automated contracts cover configured, partial, and missing map states; list fallback; textual status; canonical navigation; bulk projection; and absence of private Work Order data on the public map. Hosted responsive checks at 320, 390, 430, tablet, and desktop remain a preview gate because browser automation is unavailable in this environment.

No migration is required. No production deployment is authorized.
