import { CrossroadsPageShell } from "@/components/crossroads/crossroads-ui";
import { CrossroadsGmMode } from "@/components/gm/crossroads-gm-mode";

export const dynamic = "force-dynamic";

export default function CrossroadsGmPage() {
  return (
    <CrossroadsPageShell eyebrow="GM Mode" title="Crossroads Executive Center">
      <CrossroadsGmMode />
    </CrossroadsPageShell>
  );
}
