"use client";

import { useState } from "react";
import type { VolunteerRoleStatus } from "@/lib/types";
import { updateVolunteerRoleStatusAction } from "./actions";

export function VolunteerStatusButton({
  id,
  label,
  status,
}: {
  id: string;
  label: string;
  status: VolunteerRoleStatus;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    setIsSaving(true);
    const result = await updateVolunteerRoleStatusAction(id, status).catch((error: unknown) => ({
      error: error instanceof Error ? error.message : "Unable to update volunteer role.",
    }));
    if (result.error) {
      console.error("Failed to update volunteer role", result.error);
    }
    setIsSaving(false);
  }

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold disabled:opacity-60"
      disabled={isSaving}
      onClick={handleClick}
      type="button"
    >
      {isSaving ? "Saving..." : label}
    </button>
  );
}
