import { AppFrame } from "@/components/access/app-frame";

export default function TodayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppFrame>{children}</AppFrame>;
}
