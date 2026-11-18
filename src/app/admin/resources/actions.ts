"use server";

import { revalidatePath } from "next/cache";
import { createResource } from "@/lib/services/resources";
import { resolveSession } from "@/lib/access/session";
import { PermissionDeniedError } from "@/lib/services/identity";
import type { Resource } from "@/lib/types";
import { readResourceFormData } from "./form-utils";

export type CreateResourceResult = {
  resource?: Resource;
  error?: string;
};

function revalidateResourceSurfaces() {
  revalidatePath("/admin/resources");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function createResourceAction(formData: FormData): Promise<CreateResourceResult> {
  const parsed = readResourceFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const session = await resolveSession();
    if (session.kind !== "active") throw new PermissionDeniedError();
    const resource = await createResource(parsed.data, session.context);
    revalidateResourceSurfaces();
    return { resource };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create resource." };
  }
}
