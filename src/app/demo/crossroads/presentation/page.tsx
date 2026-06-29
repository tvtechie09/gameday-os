import { PresentationMode } from "@/components/demo/presentation-mode";
import { crossroadsPresentationModel } from "@/lib/demo/crossroads-presentation";

export const dynamic = "force-dynamic";

export default function CrossroadsPresentationPage() {
  return <PresentationMode model={crossroadsPresentationModel} />;
}
