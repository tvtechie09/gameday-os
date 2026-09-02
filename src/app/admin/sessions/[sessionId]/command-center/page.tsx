import { redirect } from "next/navigation";

// Preserve the game context instead of dropping a bookmarked operator into a
// retired aggregate board.
export default async function LegacySessionCommandCenterPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  redirect(`/admin/sessions/${encodeURIComponent(sessionId)}`);
}
