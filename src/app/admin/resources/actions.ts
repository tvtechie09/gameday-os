"use server";

import { revalidatePath } from "next/cache";
import { createResource } from "@/lib/services/resources";
import type { Resource } from "@/lib/types";
import { readResourceFormData } from "./form-utils";

export type CreateResourceResult = {
  resource?: Resource;
  error?: string;
};

function revalidateResourceSurfaces() {
  revalidatePath("/admin/resources");
  revalidatePath("/admin/dashboard");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function createResourceAction(formData: FormData): Promise<CreateResourceResult> {
  const parsed = readResourceFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const resource = await createResource(parsed.data);
    revalidateResourceSurfaces();
    return { resource };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create resource." };
  }
}
