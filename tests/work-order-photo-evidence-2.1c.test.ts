import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  matchesWorkOrderPhotoSignature,
  validateWorkOrderPhotoDescriptor,
  WORK_ORDER_PHOTO_MAX_BYTES,
  WorkOrderPhotoValidationError,
} from "../src/lib/work-order-photo-core.ts";

const migration = readFileSync("supabase/migrations/20260910143000_work_order_photo_evidence_2_1c.sql", "utf8");
const lifecycleMigration = readFileSync("supabase/migrations/20260911005547_harden_work_order_photo_lifecycle.sql", "utf8");
const service = readFileSync("src/lib/services/work-order-photos.ts", "utf8");
const actions = readFileSync("src/app/admin/fields/work-orders/actions.ts", "utf8");
const form = readFileSync("src/app/admin/fields/work-orders/work-order-form.tsx", "utf8");
const evidence = readFileSync("src/app/admin/fields/work-orders/work-order-photo-evidence.tsx", "utf8");
const detail = readFileSync("src/app/admin/fields/work-orders/[workOrderId]/page.tsx", "utf8");
const publicField = readFileSync("src/app/fields/[fieldId]/page.tsx", "utf8");

test("only bounded mobile image formats are accepted", () => {
  assert.equal(validateWorkOrderPhotoDescriptor({ type: "image/jpeg", size: 100 }).extension, "jpg");
  assert.equal(validateWorkOrderPhotoDescriptor({ type: "image/png", size: WORK_ORDER_PHOTO_MAX_BYTES }).extension, "png");
  assert.throws(() => validateWorkOrderPhotoDescriptor({ type: "application/pdf", size: 100 }), WorkOrderPhotoValidationError);
  assert.throws(() => validateWorkOrderPhotoDescriptor({ type: "image/jpeg", size: WORK_ORDER_PHOTO_MAX_BYTES + 1 }), /smaller than 8 MB/);
  assert.throws(() => validateWorkOrderPhotoDescriptor({ type: "image/jpeg", size: 0 }), /smaller than 8 MB/);
});

test("file signatures must match the declared image type", () => {
  assert.equal(matchesWorkOrderPhotoSignature(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(matchesWorkOrderPhotoSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(matchesWorkOrderPhotoSignature(new Uint8Array([0xff, 0xd8, 0xff]), "image/png"), false);
});

test("storage is private, service-only, bounded, and metadata is retained on removal", () => {
  assert.match(migration, /'work-order-evidence'[\s\S]+false, 8388608/);
  assert.match(migration, /revoke all on table public\.work_order_photos from anon, authenticated/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /removed_at timestamptz/);
  assert.match(migration, /on delete restrict/);
  assert.match(migration, /No storage\.objects policy is created for browser roles/);
});

test("reads use short-lived signed URLs and never public URLs", () => {
  assert.match(service, /createSignedUrl\(row\.storage_key, SIGNED_URL_SECONDS\)/);
  assert.match(service, /const SIGNED_URL_SECONDS = 300/);
  assert.doesNotMatch(service, /getPublicUrl/);
  assert.doesNotMatch(publicField, /work_order_photos|WorkOrderPhotoEvidence/);
});

test("upload and delete stay behind Work Order object and venue authorization", () => {
  assert.match(actions, /const \{ ctx, order \} = await authorizeOrder\(workOrderId\)/);
  assert.match(actions, /getWorkOrderPhotoRecord\(mediaId, order\)/);
  assert.match(actions, /photo\.uploaderActorUserId !== ctx\.userId && !canManageVenueSettings\(ctx\)/);
  assert.match(service, /eq\("venue_id", order\.venueId\)/);
});

test("audit payloads contain stable media identity but no path or signed URL", () => {
  assert.match(actions, /"work_order\.photo_added", \{ media_id: media\.id, purpose/);
  assert.match(actions, /"work_order\.photo_removed", \{ media_id: mediaId, purpose/);
  assert.doesNotMatch(actions, /auditWorkOrder\([^\n]+storage_key|auditWorkOrder\([^\n]+signedUrl/);
});

test("optional upload failure cannot roll back creation or resolution", () => {
  assert.match(actions, /Work order created, but the photo did not upload/);
  assert.match(actions, /Work order resolved, but the optional photo did not upload/);
  assert.match(actions, /const updated = await resolveWorkOrder[\s\S]+try \{[\s\S]+uploadWorkOrderPhoto/);
  assert.match(form, /query\.set\("photo", "failed"\)/);
  assert.match(detail, /Work Order saved; photo not uploaded/);
});

test("mobile UI offers camera input, preview, pending state, and duplicate protection", () => {
  for (const source of [form, evidence]) {
    assert.match(source, /capture="environment"/);
    assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
    assert.match(source, /Selected photo preview/);
    assert.match(source, /disabled=\{pending\}/);
  }
  assert.match(evidence, /Uploading photo…/);
  assert.match(evidence, /photos\.length < 5/);
  assert.match(detail, /WorkOrderPhotoEvidence/);
});

test("resolution without a photo remains supported", () => {
  assert.match(actions, /photo\?: File \| null/);
  assert.match(actions, /if \(photo && photo\.size > 0\)/);
});

test("the five-photo limit is serialized at the Work Order row", () => {
  assert.match(lifecycleMigration, /from public\.field_work_orders[\s\S]+for update/);
  assert.match(lifecycleMigration, /storage_status in \('PENDING', 'ACTIVE'\)/);
  assert.match(lifecycleMigration, /v_active_count >= 5/);
  assert.match(lifecycleMigration, /WORK_ORDER_PHOTO_LIMIT_REACHED/);
});

test("storage upload is reserved before object creation", () => {
  const reserveAt = service.indexOf('storage_status: "PENDING"');
  const uploadAt = service.indexOf(".upload(storageKey, bytes");
  assert.ok(reserveAt >= 0 && uploadAt > reserveAt);
  assert.match(service, /storage_status: "ACTIVE"/);
  assert.match(service, /STORAGE_UPLOAD_FAILED/);
  assert.match(service, /PHOTO_FINALIZE_FAILED/);
});

test("incomplete object cleanup remains private, bounded, and detectable", () => {
  assert.match(service, /reconcileIncompletePhotoStorage/);
  assert.match(service, /\.limit\(WORK_ORDER_PHOTO_MAX_COUNT\)/);
  assert.match(service, /DELETE_PENDING/);
  assert.match(lifecycleMigration, /get_work_order_photo_storage_health/);
  assert.match(lifecycleMigration, /orphanObjectCount/);
  assert.match(lifecycleMigration, /revoke all on function public\.get_work_order_photo_storage_health\(\)[\s\S]+from public, anon, authenticated/);
});
