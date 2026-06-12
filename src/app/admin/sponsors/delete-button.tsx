"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSponsorAction, deleteSponsorAssignmentAction } from "./actions";

export function DeleteButton({
  id,
  label,
  message,
  type,
}: {
  id: string;
  label: string;
  message: string;
  type: "sponsor" | "assignment";
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting || !window.confirm(message)) {
      return;
    }

    setIsDeleting(true);
    const result = type === "sponsor" ? await deleteSponsorAction(id) : await deleteSponsorAssignmentAction(id);

    if (result.error) {
      console.error(result.error);
      window.alert(result.error);
      setIsDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isDeleting}
      onClick={handleDelete}
      type="button"
    >
      {isDeleting ? "Deleting..." : label}
    </button>
  );
}
