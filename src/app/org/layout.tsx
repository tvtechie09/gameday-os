import { AppFrame } from "@/components/access/app-frame";

export default function OrgLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppFrame>{children}</AppFrame>;
}
