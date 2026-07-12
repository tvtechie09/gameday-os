import { ScorePad } from "./score-pad";

export const dynamic = "force-dynamic";

export default async function ScorekeeperPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-[var(--background)] px-3">
      <ScorePad token={token} />
    </main>
  );
}
