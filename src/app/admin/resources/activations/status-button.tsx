"use client";

import { useState } from "react";
import { assignActivationToSessionAction, updateActivationStatusAction } from "./actions";
import type { ResourceActivationStatus } from "@/lib/types";

export function ActivationStatusButton({
  id,
  status,
  label,
}: {
  id: string;
  status: ResourceActivationStatus;
  label: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    setIsSaving(true);
    const result = await updateActivationStatusAction(id, status).catch((error: unknown) => ({
      error: error instanceof Error ? error.message : "Unable to update activation.",
    }));
    if (result.error) {
      console.error("Failed to update activation", result.error);
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

export function AssignActivationButton({
  id,
  sessionId,
}: {
  id: string;
  sessionId: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    setIsSaving(true);
    const result = await assignActivationToSessionAction(id, sessionId).catch((error: unknown) => ({
      error: error instanceof Error ? error.message : "Unable to assign activation.",
    }));
    if (result.error) {
      console.error("Failed to assign activation", result.error);
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
      {isSaving ? "Saving..." : "Assign to active session"}
    </button>
  );
}
