import { redirect } from "next/navigation";

// Kept as a compatibility route for bookmarks. The live venue Command Center
// replaced the former per-session dashboard so operators have one operational
// source of truth instead of a different command surface for every game.
export default function LegacySessionCommandCenterPage() {
  redirect("/admin/command-center");
}
