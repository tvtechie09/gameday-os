import { redirect } from "next/navigation";
import { NlsaHeader, OwnerToday } from "@/components/nlsa/nlsa-demo";
import { getSessionContext } from "@/lib/access/session";
import { canAccessNlsaExperience } from "@/lib/demo/nlsa-access";
import { getNlsaScenario } from "@/lib/demo/nlsa";

export const dynamic = "force-dynamic";

export default async function NlsaTodayPage({ searchParams }: Readonly<{ searchParams: Promise<{ scenario?: string }> }>) {
  const [ctx, params] = await Promise.all([getSessionContext(), searchParams]);
  if (!ctx || !canAccessNlsaExperience(ctx, "owner")) redirect("/no-access");
  const scenario = getNlsaScenario(params.scenario);
  return <><NlsaHeader active="today" ctx={ctx} scenario={scenario} /><OwnerToday scenario={scenario} /></>;
}
