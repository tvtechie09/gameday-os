import { redirect } from "next/navigation";
import { CoachView, NlsaHeader } from "@/components/nlsa/nlsa-demo";
import { getSessionContext } from "@/lib/access/session";
import { canAccessNlsaExperience } from "@/lib/demo/nlsa-access";
import { getNlsaScenario } from "@/lib/demo/nlsa";

export const dynamic = "force-dynamic";

export default async function NlsaCoachPage({ searchParams }: Readonly<{ searchParams: Promise<{ scenario?: string }> }>) {
  const [ctx, params] = await Promise.all([getSessionContext(), searchParams]);
  if (!ctx || !canAccessNlsaExperience(ctx, "coach")) redirect("/no-access");
  const scenario = getNlsaScenario(params.scenario);
  return <><NlsaHeader active="coach" ctx={ctx} scenario={scenario} /><CoachView scenario={scenario} /></>;
}
