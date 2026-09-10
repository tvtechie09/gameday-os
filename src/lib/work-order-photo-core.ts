export const WORK_ORDER_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const WORK_ORDER_PHOTO_MAX_COUNT = 5;
export const workOrderPhotoPurposes = ["report", "progress", "resolution"] as const;
export type WorkOrderPhotoPurpose = (typeof workOrderPhotoPurposes)[number];

const allowedMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export class WorkOrderPhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkOrderPhotoValidationError";
  }
}

export function validateWorkOrderPhotoDescriptor(input: { type: string; size: number }) {
  const extension = allowedMimeTypes.get(input.type.toLowerCase());
  if (!extension) throw new WorkOrderPhotoValidationError("Use a JPEG, PNG, or WebP image.");
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > WORK_ORDER_PHOTO_MAX_BYTES) {
    throw new WorkOrderPhotoValidationError("Photo must be smaller than 8 MB.");
  }
  return { extension, mimeType: input.type.toLowerCase() };
}

export function matchesWorkOrderPhotoSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mimeType === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export function isWorkOrderPhotoPurpose(value: unknown): value is WorkOrderPhotoPurpose {
  return typeof value === "string" && workOrderPhotoPurposes.includes(value as WorkOrderPhotoPurpose);
}
