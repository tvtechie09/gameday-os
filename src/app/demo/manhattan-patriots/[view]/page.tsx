import { notFound } from "next/navigation";
import { PatriotsDemo } from "@/components/patriots/patriots-demo";
import { isPatriotsView } from "@/lib/demo/manhattan-patriots";
export default async function PatriotsDemoView({ params }: { params: Promise<{ view: string }> }) { const { view } = await params; if (!isPatriotsView(view)) notFound(); return <PatriotsDemo view={view} />; }
