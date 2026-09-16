import { AppFrame } from "@/components/access/app-frame";

// Admin workspace shares the capability-filtered AppFrame. The root proxy
// provides the route login wall; every server action must authorize again.
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppFrame>{children}</AppFrame>;
}
