import { revalidatePath } from "next/cache";
import { getAssignment, respondToAssignment } from "@/lib/services/officials";

export const dynamic = "force-dynamic";

// Public official confirm page — tokenized, no account needed (the
// scorekeeper-link pattern).
export default async function OfficiatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const assignment = await getAssignment(token).catch(() => null);

  async function respond(formData: FormData) {
    "use server";
    const response = String(formData.get("response")) === "declined" ? "declined" as const : "confirmed" as const;
    await respondToAssignment(token, response);
    revalidatePath("/officiate/" + token);
  }

  if (!assignment) {
    return (
      <main className="mx-auto mt-16 max-w-md px-4">
        <h1 className="text-2xl font-black">Assignment not found</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This link is invalid or was removed. Check with the venue.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">GameDay OS</p>
      <h1 className="mt-2 text-2xl font-black">Officiating assignment</h1>
      <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm leading-7">
          <span className="font-black">{assignment.officialName}</span>, you&apos;re assigned as{" "}
          <span className="font-black">{assignment.role}</span> for:
        </p>
        <p className="mt-2 text-lg font-black">{assignment.label}</p>
        <p className="text-sm text-[var(--muted)]">
          {assignment.when}
          {assignment.fieldName ? " · " + assignment.fieldName : ""}
        </p>
        {assignment.status === "assigned" ? (
          <form action={respond} className="mt-5 grid grid-cols-2 gap-3">
            <button className="min-h-12 rounded-lg bg-[var(--accent)] text-sm font-black text-white" name="response" type="submit" value="confirmed">
              Confirm
            </button>
            <button className="min-h-12 rounded-lg border border-[var(--line)] bg-white text-sm font-black" name="response" type="submit" value="declined">
              Decline
            </button>
          </form>
        ) : (
          <p className={"mt-5 rounded-lg p-3 text-sm font-black " + (assignment.status === "confirmed" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")}>
            You {assignment.status} this assignment. Need to change it? Contact the venue.
          </p>
        )}
      </div>
    </main>
  );
}
