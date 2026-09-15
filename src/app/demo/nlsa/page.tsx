import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { getNlsaHome } from "@/lib/demo/nlsa-access";

export const dynamic = "force-dynamic";

export default async function NlsaDemoPage() {
  const ctx = await getSessionContext();
  redirect(getNlsaHome(ctx) ?? "/no-access");
}
