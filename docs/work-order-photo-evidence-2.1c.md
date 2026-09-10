# GameDay Improvement 2.1C — Work Order Photo Evidence

## Decision

Work Orders support up to five optional JPEG, PNG, or WebP photos (8 MB each) for the reported problem, progress, or resolution. This is evidence attached to one Work Order—not a general media library.

## Storage audit and architecture

Venue previously had URL arrays on Venue Assets and demo photo placeholders, but no Work Order upload helper, private Storage bucket, processing pipeline, or image retention contract. GameDay Team has separate private document storage patterns; those domain records and buckets are not reused because Work Order authorization is venue/object scoped.

Migration `20260910143000_work_order_photo_evidence_2_1c.sql` creates:

- private Supabase Storage bucket `work-order-evidence`
- 8 MB bucket limit and JPEG/PNG/WebP allowlist
- service-only `work_order_photos` metadata with Work Order, venue, uploader actor, opaque storage key, purpose, size/type, creation, and logical removal fields
- active-order, venue, and uploader indexes

No `storage.objects` policy is granted to browser roles. Uploads use the server service client; reads use five-minute signed URLs after the page has authorized and venue-scoped the Work Order. Public field/QR pages do not query or render this table.

## Authorization

Every upload/read/remove begins from the existing Work Order detail authorization boundary. The actor must be signed in, non-organization-scoped, have field-work capability, and the Work Order and optional field must be inside the actor's venue scope. Staff and GM may add evidence. The uploader may remove their own accidental photo; venue management may remove any photo for the venue. Neither actor can provide or override the venue, uploader, storage key, or media ID.

## User experience

- Report: one optional native camera/photo input and local preview.
- Progress/detail: **Add Photo**, a three-choice plain-language purpose, preview, and visible uploading state.
- Resolution: one optional after-repair photo next to the existing optional resolution note.
- Gallery: responsive two/three-column thumbnails; full evidence opens through a short-lived signed link.
- Duplicate interaction is disabled while an upload/remove is pending.

Photos are never required. A photo is validated by MIME type, size, and binary signature. Opaque UUID paths avoid filename identity.

## Failure separation and audit

Create and resolve persist the Work Order state before optional storage upload. If storage fails, the action returns success with a specific photo warning; it never reports an uncommitted photo and never reverses the Work Order. A standalone upload fails without changing lifecycle state.

`work_order.photo_added` and `work_order.photo_removed` audit events contain only stable media ID and purpose. They never include binary data, storage keys, filenames, or signed URLs. Removal marks the metadata row removed before best-effort object cleanup, retaining evidence history even when the binary is gone.

## Privacy, deletion, and retention

The original file is currently stored. The stack has no trusted image transcoder, so EXIF/GPS stripping and server-side compression are not claimed. The UI warns only supported formats and size; operational guidance should avoid photos with people or unrelated sensitive content. Adding a large image pipeline solely for this sprint would increase risk.

Removed objects are logically unavailable immediately and the storage object is deleted best-effort. Active evidence has no automatic expiry. Final legal/business retention duration is a policy blocker for Privacy 2.3A; until set, Work Order deletion is restricted and metadata is retained.

## Responsive/accessibility contract

Controls are single-column at phone widths, switch to two columns only when space permits, use native file inputs/camera capture, expose text purpose labels, provide local preview semantics, and keep actions at least 40–44px. The gallery uses two columns at 320/390/430 and three on larger screens. Hosted responsive and real Storage acceptance remain required.

## Release gate

Before any deployment, apply the migration in staging and verify bucket privacy, storage policies (including absence of any broad pre-existing `storage.objects` policy), GM/Staff upload, cross-venue/object denial, signed read expiry, removal/audit, 5-photo concurrency behavior, and create/resolve failure separation. Production promotion is not authorized.
