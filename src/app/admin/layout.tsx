import { AppFrame } from "@/components/access/app-frame";

// Admin workspace shares the capability-filtered AppFrame. Per-route access is
// enforced in middleware (guardForAdminPath); this layout just renders the
// role-appropriate navigation and impersonation banner.
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppFrame>{children}</AppFrame>;
}
