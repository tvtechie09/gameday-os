import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";

export default async function IdentityLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ctx = await getSessionContext();

  if (!ctx || !canManageUsers(ctx)) {
    redirect(getRoleHome(ctx));
  }

  return children;
}
